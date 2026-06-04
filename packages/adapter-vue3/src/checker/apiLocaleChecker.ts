import { parse as sfcParse } from '@vue/compiler-sfc'
import { parse as babelParse } from '@babel/parser'
import _traverse from '@babel/traverse'
import type { ReactiveIssue } from '../types.js'

// @babel/traverse ESM 兼容处理
const traverse = (_traverse as any).default || _traverse

/** API 请求函数名关键词 */
const API_KEYWORDS = ['fetch', 'get', 'post', 'put', 'delete', 'request', 'api', 'load', 'query']

/** 判断函数名是否可能是 API 调用 */
function isLikelyApiCall(name: string): boolean {
  const lowerName = name.toLowerCase()
  return API_KEYWORDS.some(keyword => lowerName.includes(keyword))
}

/**
 * 递归检查 AST 节点是否使用了 locale.value 或 i18n.locale
 * 包括成员访问表达式和函数参数
 */
function usesLocale(node: any): boolean {
  if (!node || typeof node !== 'object') return false

  // 检查成员访问：locale.value 或 i18n.locale
  if (node.type === 'MemberExpression') {
    const object = node.object
    const property = node.property

    // locale.value
    if (
      object.type === 'Identifier' &&
      object.name === 'locale' &&
      property.type === 'Identifier' &&
      property.name === 'value'
    ) {
      return true
    }

    // i18n.locale
    if (
      object.type === 'Identifier' &&
      object.name === 'i18n' &&
      property.type === 'Identifier' &&
      property.name === 'locale'
    ) {
      return true
    }
  }

  // 递归检查所有子节点
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue
    const child = node[key]
    if (Array.isArray(child)) {
      if (child.some((c: any) => c && typeof c === 'object' && usesLocale(c))) return true
    } else if (child && typeof child === 'object' && child.type) {
      if (usesLocale(child)) return true
    }
  }

  return false
}

/**
 * 检查节点内是否包含可能的 API 调用且使用了 locale
 * 返回找到的 API 调用节点列表
 */
function findApiCallsWithLocale(node: any): any[] {
  const results: any[] = []
  if (!node) return results

  const checkNode = (n: any) => {
    if (!n || typeof n !== 'object') return

    // 检测 CallExpression
    if (n.type === 'CallExpression') {
      const callee = n.callee
      let functionName = ''

      // 识别函数名（支持 Identifier 和 MemberExpression）
      if (callee.type === 'Identifier') {
        functionName = callee.name
      } else if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        functionName = callee.property.name
      }

      // 判断是否是 API 调用且使用了 locale
      if (isLikelyApiCall(functionName) && usesLocale(n)) {
        results.push(n)
      }
    }

    // 递归检查所有子节点
    for (const key of Object.keys(n)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue
      const child = n[key]
      if (Array.isArray(child)) {
        child.forEach((c: any) => c && typeof c === 'object' && checkNode(c))
      } else if (child && typeof child === 'object' && child.type) {
        checkNode(child)
      }
    }
  }

  checkNode(node)
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
 * API locale 监听检测器
 *
 * 检测 onMounted/onBeforeMount 中的 API 请求是否监听 locale 变化
 */
export class ApiLocaleChecker {
  check(source: string, filePath: string): ReactiveIssue[] {
    const issues: ReactiveIssue[] = []

    try {
      const { descriptor } = sfcParse(source, { filename: filePath })

      // 检查 script setup 块
      if (descriptor.scriptSetup) {
        issues.push(...this.checkScript(descriptor.scriptSetup.content, filePath, descriptor.scriptSetup.loc.start.line))
      }

      // 检查普通 script 块
      if (descriptor.script) {
        issues.push(...this.checkScript(descriptor.script.content, filePath, descriptor.script.loc.start.line))
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

    // 收集所有 API 调用信息
    const apiCalls: Array<{ node: any; inLifecycle: boolean }> = []
    let hasLocaleWatch = false

    traverse(ast, {
      // 检测 watch(locale, ...) 监听
      CallExpression(path: any) {
        const node = path.node
        const callee = node.callee

        // 检测 watch(locale, ...)
        if (callee.type === 'Identifier' && callee.name === 'watch') {
          const firstArg = node.arguments[0]
          if (firstArg && firstArg.type === 'Identifier' && firstArg.name === 'locale') {
            hasLocaleWatch = true
          }
        }

        // 检测 onMounted / onBeforeMount 内的 API 调用
        if (
          callee.type === 'Identifier' &&
          (callee.name === 'onMounted' || callee.name === 'onBeforeMount')
        ) {
          const callback = node.arguments[0]
          if (!callback) return

          // 查找回调函数内的 API 调用
          const apiCallNodes = findApiCallsWithLocale(callback)
          apiCallNodes.forEach(apiNode => {
            apiCalls.push({ node: apiNode, inLifecycle: true })
          })
        }
      },
    })

    // 如果有 locale 监听，不报告任何问题
    if (hasLocaleWatch) {
      return issues
    }

    // 报告未监听 locale 变化的 API 调用
    for (const { node, inLifecycle } of apiCalls) {
      if (!inLifecycle) continue // 只关注生命周期钩子内的调用

      const line = startLine + (node.loc?.start.line || 1) - 1
      const column = node.loc?.start.column || 0
      const code = getCodeSnippet(node, scriptContent)

      issues.push({
        type: 'api-locale-watch',
        filePath,
        line,
        column,
        code,
        suggestion: '考虑添加 watch(locale, () => { yourApiFunction() }) 以在语言切换时重新请求数据',
      })
    }

    return issues
  }
}


