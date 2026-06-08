import { parse as sfcParse } from '@vue/compiler-sfc'
import { parse as babelParse } from '@babel/parser'
import _traverse from '@babel/traverse'
import type { ReactiveIssue } from '../types.js'

// @babel/traverse ESM 兼容处理
const traverse = (_traverse as any).default || _traverse

/** 判断 AST 节点是否包含 t() 或 $t() 调用 */
function containsTCall(node: any): boolean {
  if (!node || typeof node !== 'object') return false

  if (node.type === 'CallExpression') {
    const callee = node.callee
    if (callee.type === 'Identifier' && (callee.name === 't' || callee.name === '$t')) {
      return true
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue
    const child = node[key]
    if (Array.isArray(child)) {
      if (child.some((c: any) => c && typeof c === 'object' && containsTCall(c))) return true
    } else if (child && typeof child === 'object' && child.type) {
      if (containsTCall(child)) return true
    }
  }

  return false
}

/** 从 AST 节点提取源码片段 */
function getCodeSnippet(node: any, source: string): string {
  if (node.start != null && node.end != null) {
    return source.slice(node.start, node.end)
  }
  return ''
}

/** 判断函数节点参数中是否声明了 t 形参（工厂函数模式） */
function functionDeclaresTParam(funcNode: any): boolean {
  if (!funcNode || !Array.isArray(funcNode.params)) return false
  return funcNode.params.some(
    (p: any) => p.type === 'Identifier' && (p.name === 't' || p.name === '$t')
  )
}

/**
 * 缓存 ref 响应式更新检测器
 *
 * 检测将含 t() 调用的数据缓存到 ref，但缺少 watch(locale) 同步的场景。
 * 典型问题：
 *   const visible = ref([])
 *   visible.value = items.map(i => ({ label: t(i.key) }))
 * 切换语言后 visible.value 不会自动更新。
 */
export class CachedRefLocaleChecker {
  check(source: string, filePath: string): ReactiveIssue[] {
    const issues: ReactiveIssue[] = []

    try {
      const { descriptor } = sfcParse(source, { filename: filePath })

      if (descriptor.scriptSetup) {
        issues.push(
          ...this.checkScript(
            descriptor.scriptSetup.content,
            filePath,
            descriptor.scriptSetup.loc.start.line
          )
        )
      }

      if (descriptor.script) {
        issues.push(
          ...this.checkScript(
            descriptor.script.content,
            filePath,
            descriptor.script.loc.start.line
          )
        )
      }
    } catch {
      // 解析失败返回空数组
    }

    return issues
  }

  private checkScript(
    scriptContent: string,
    filePath: string,
    startLine: number
  ): ReactiveIssue[] {
    const issues: ReactiveIssue[] = []

    let ast: any
    try {
      ast = babelParse(scriptContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      })
    } catch {
      return issues
    }

    // 第一遍：收集所有 const/let xxx = ref(...) 声明（排除 ref(t(...))）
    const refNames = new Set<string>()

    traverse(ast, {
      VariableDeclarator(path: any) {
        const { id, init } = path.node
        if (!init || id.type !== 'Identifier') return
        if (
          init.type !== 'CallExpression' ||
          init.callee.type !== 'Identifier' ||
          init.callee.name !== 'ref'
        )
          return

        // 排除 ref(t(...)) — 已由 ReactiveChecker 覆盖
        const firstArg = init.arguments[0]
        if (firstArg && containsTCall(firstArg)) return

        refNames.add(id.name)
      },
    })

    if (refNames.size === 0) return issues

    // 第二遍：检测 watch(...) 是否同步了 locale 或这些 ref
    const watchedTargets = new Set<string>()
    let hasLocaleWatch = false

    traverse(ast, {
      CallExpression(path: any) {
        const callee = path.node.callee
        if (callee.type !== 'Identifier' || callee.name !== 'watch') return

        const firstArg = path.node.arguments[0]
        if (!firstArg) return

        if (firstArg.type === 'Identifier') {
          if (firstArg.name === 'locale') {
            hasLocaleWatch = true
          } else if (refNames.has(firstArg.name)) {
            watchedTargets.add(firstArg.name)
          }
        }

        // watch([a, b, locale], ...) 数组形式
        if (firstArg.type === 'ArrayExpression') {
          for (const el of firstArg.elements) {
            if (!el || el.type !== 'Identifier') continue
            if (el.name === 'locale') hasLocaleWatch = true
            else if (refNames.has(el.name)) watchedTargets.add(el.name)
          }
        }
      },
    })

    if (hasLocaleWatch) return issues

    // 第三遍：检测 xxx.value = expr 赋值，且右侧含 t() 调用
    traverse(ast, {
      AssignmentExpression: (path: any) => {
        const node = path.node
        if (node.operator !== '=') return

        const left = node.left
        if (
          left.type !== 'MemberExpression' ||
          left.object.type !== 'Identifier' ||
          left.property.type !== 'Identifier' ||
          left.property.name !== 'value' ||
          left.computed
        )
          return

        const refName = left.object.name
        if (!refNames.has(refName)) return
        if (watchedTargets.has(refName)) return

        if (!containsTCall(node.right)) return

        // 排除工厂函数模式：所在函数若把 t 作为形参传入，视为正确传参
        let parent = path.parentPath
        let inFactoryFunction = false
        while (parent) {
          const pn = parent.node
          if (
            pn &&
            (pn.type === 'FunctionDeclaration' ||
              pn.type === 'FunctionExpression' ||
              pn.type === 'ArrowFunctionExpression') &&
            functionDeclaresTParam(pn)
          ) {
            inFactoryFunction = true
            break
          }
          parent = parent.parentPath
        }
        if (inFactoryFunction) return

        const line = startLine + (node.loc?.start.line || 1) - 1
        const column = node.loc?.start.column || 0
        issues.push({
          type: 'cached-ref-locale',
          filePath,
          line,
          column,
          code: getCodeSnippet(node, scriptContent),
          suggestion: `ref "${refName}" 缓存了含 t() 的数据但缺少响应式同步：添加 watch(locale, () => { /* 重新计算 ${refName}.value */ })`,
        })
      },
    })

    return issues
  }
}
