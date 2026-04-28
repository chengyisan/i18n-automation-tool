import { parse as sfcParse } from '@vue/compiler-sfc'
import { parse as babelParse } from '@babel/parser'
import _traverse from '@babel/traverse'
import type { ReactiveIssue } from '../types.js'

// @babel/traverse ESM 兼容处理
const traverse = (_traverse as any).default || _traverse

/** 判断 AST 节点是否包含 t() 或 $t() 调用 */
function containsTCall(node: any): boolean {
  if (!node) return false

  if (node.type === 'CallExpression') {
    const callee = node.callee
    if (callee.type === 'Identifier' && (callee.name === 't' || callee.name === '$t')) {
      return true
    }
  }

  // 递归检查子节点
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

/**
 * 响应式问题检测器
 *
 * 检测 Vue 3 组件中 t() 调用的响应式问题
 */
export class ReactiveChecker {
  check(source: string, filePath: string): ReactiveIssue[] {
    const issues: ReactiveIssue[] = []

    try {
      const { descriptor } = sfcParse(source, { filename: filePath })

      // 检查 script 块
      if (descriptor.script) {
        issues.push(...this.checkScript(descriptor.script.content, filePath, descriptor.script.loc.start.line))
      }

      // 检查 script setup 块
      if (descriptor.scriptSetup) {
        issues.push(...this.checkScript(descriptor.scriptSetup.content, filePath, descriptor.scriptSetup.loc.start.line))
      }
    } catch {
      // 解析失败时返回空数组
    }

    return issues
  }

  /** 检查 script 内容 */
  private checkScript(scriptContent: string, filePath: string, startLine: number): ReactiveIssue[] {
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

    // 遍历 AST，只检查顶层声明
    traverse(ast, {
      VariableDeclaration(path: any) {
        // 只检查顶层声明（不在函数内部）
        if (path.parent.type !== 'Program') return

        for (const declarator of path.node.declarations) {
          const init = declarator.init
          if (!init) continue

          const line = startLine + (declarator.loc?.start.line || 1) - 1
          const column = declarator.loc?.start.column || 0
          const code = getCodeSnippet(declarator, scriptContent)

          // 规则 1: ref(t(...))
          if (init.type === 'CallExpression' && init.callee.type === 'Identifier' && init.callee.name === 'ref') {
            if (containsTCall(init.arguments[0])) {
              issues.push({
                type: 'ref-with-t',
                filePath,
                line,
                column,
                code,
                suggestion: '使用 computed(() => t(...)) 替代 ref(t(...))',
              })
              continue
            }
          }

          // 规则 2: 静态对象/数组中包含 t()
          if ((init.type === 'ArrayExpression' || init.type === 'ObjectExpression') && containsTCall(init)) {
            issues.push({
              type: 'static-object-with-t',
              filePath,
              line,
              column,
              code,
              suggestion: '使用 computed(() => [...]) 包裹含 t() 的静态对象/数组',
            })
            continue
          }

          // 规则 3: 顶层直接赋值 t()
          if (init.type === 'CallExpression') {
            const callee = init.callee
            if (callee.type === 'Identifier' && (callee.name === 't' || callee.name === '$t')) {
              issues.push({
                type: 'top-level-t-assignment',
                filePath,
                line,
                column,
                code,
                suggestion: '使用 computed(() => t(...)) 替代直接赋值',
              })
              continue
            }
          }

          // 排除 computed(() => t(...)) 的情况
          if (init.type === 'CallExpression' && init.callee.type === 'Identifier' && init.callee.name === 'computed') {
            // 这是正确写法，不报告
            continue
          }
        }
      },
    })

    return issues
  }
}

