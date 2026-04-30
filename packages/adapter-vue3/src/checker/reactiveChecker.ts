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

/** 判断 return 的表达式是否被 computed() 包裹 */
function isComputedWrapped(argument: any): boolean {
  if (!argument) return false
  if (argument.type === 'CallExpression' && argument.callee.type === 'Identifier' && argument.callee.name === 'computed') {
    return true
  }
  return false
}

/**
 * 检查函数体中的 return 语句是否包含 t() 调用的数组/对象
 * 返回找到的问题 return 语句节点列表
 */
function findReturnWithTCall(body: any): any[] {
  const results: any[] = []
  if (!body || body.type !== 'BlockStatement') return results

  for (const statement of body.body) {
    if (statement.type !== 'ReturnStatement' || !statement.argument) continue
    const argument = statement.argument

    // 排除 return computed(() => ...) 的情况
    if (isComputedWrapped(argument)) continue

    // 检测 return 数组/对象中包含 t()
    if ((argument.type === 'ArrayExpression' || argument.type === 'ObjectExpression') && containsTCall(argument)) {
      results.push(statement)
    }
  }

  return results
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

      // 检查 script 块（非 setup，需要额外检测工厂函数问题）
      if (descriptor.script) {
        issues.push(...this.checkScript(descriptor.script.content, filePath, descriptor.script.loc.start.line))
        issues.push(...this.checkFactoryFunctions(descriptor.script.content, filePath, descriptor.script.loc.start.line))
      }

      // 检查 script setup 块（setup 内部的工厂函数不报告）
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

          // 规则 4: 箭头函数 return 包含 t() 的数组/对象
          if (init.type === 'ArrowFunctionExpression') {
            const returnStatements = findReturnWithTCall(init.body)
            for (const returnNode of returnStatements) {
              const returnLine = startLine + (returnNode.loc?.start.line || 1) - 1
              const returnColumn = returnNode.loc?.start.column || 0
              const returnCode = getCodeSnippet(returnNode, scriptContent)
              issues.push({
                type: 'jsx-return-with-t',
                filePath,
                line: returnLine,
                column: returnColumn,
                code: returnCode,
                suggestion: '在调用方使用 computed(() => useXxx()) 包裹',
              })
            }
          }
        }
      },

      // 规则 4: 函数声明中 return 包含 t() 的数组/对象
      FunctionDeclaration(path: any) {
        // 只检查顶层函数声明
        if (path.parent.type !== 'Program' && path.parent.type !== 'ExportNamedDeclaration') return

        const functionNode = path.node
        const returnStatements = findReturnWithTCall(functionNode.body)

        for (const returnNode of returnStatements) {
          const line = startLine + (returnNode.loc?.start.line || 1) - 1
          const column = returnNode.loc?.start.column || 0
          const code = getCodeSnippet(returnNode, scriptContent)
          issues.push({
            type: 'jsx-return-with-t',
            filePath,
            line,
            column,
            code,
            suggestion: '在调用方使用 computed(() => useXxx()) 包裹',
          })
        }
      },
    })

    return issues
  }

  /** 检查非 setup script 中的工厂函数同步问题 */
  private checkFactoryFunctions(
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

    const reportFactoryFunction = (node: any) => {
      const line = startLine + (node.loc?.start.line || 1) - 1
      const column = node.loc?.start.column || 0
      const code = getCodeSnippet(node, scriptContent)
      issues.push({
        type: 'factory-function-sync',
        filePath,
        line,
        column,
        code,
        suggestion: '避免在 setup 外部调用 useI18n() 或直接使用 t()，改为将 t 作为参数传入函数',
      })
    }

    const functionUsesI18n = (functionNode: any): boolean => {
      // 递归检查节点是否包含 useI18n() 或 t()/$t() 调用
      const checkNode = (node: any): boolean => {
        if (!node || typeof node !== 'object') return false

        // 检测 CallExpression
        if (node.type === 'CallExpression') {
          const callee = node.callee
          if (callee.type === 'Identifier') {
            if (callee.name === 'useI18n' || callee.name === 't' || callee.name === '$t') {
              return true
            }
          }
        }

        // 递归检查所有子节点
        for (const key of Object.keys(node)) {
          if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue
          const child = node[key]
          if (Array.isArray(child)) {
            if (child.some((c: any) => c && typeof c === 'object' && checkNode(c))) return true
          } else if (child && typeof child === 'object' && child.type) {
            if (checkNode(child)) return true
          }
        }

        return false
      }

      return checkNode(functionNode)
    }

    /** 检查函数参数中是否包含 t 参数 */
    const hasTParam = (params: any[]): boolean => {
      return params.some((p: any) => p.type === 'Identifier' && (p.name === 't' || p.name === '$t'))
    }

    traverse(ast, {
      FunctionDeclaration(path: any) {
        if (path.parent.type !== 'Program' && path.parent.type !== 'ExportNamedDeclaration') return
        const funcNode = path.node
        // 如果函数参数中有 t，说明是正确的传参模式
        if (hasTParam(funcNode.params || [])) return
        if (functionUsesI18n(funcNode)) {
          reportFactoryFunction(funcNode)
        }
      },

      VariableDeclarator(path: any) {
        if (path.parentPath.parent.type !== 'Program') return

        const init = path.node.init
        if (!init) return
        if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') return

        // 如果函数参数中有 t，说明是正确的传参模式
        if (hasTParam(init.params || [])) return
        if (functionUsesI18n(init)) {
          reportFactoryFunction(path.node)
        }
      },
    })

    return issues
  }
}
