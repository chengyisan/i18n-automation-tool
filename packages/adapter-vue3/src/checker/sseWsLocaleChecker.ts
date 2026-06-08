import { parse as sfcParse } from '@vue/compiler-sfc'
import { parse as babelParse } from '@babel/parser'
import _traverse from '@babel/traverse'
import type { ReactiveIssue } from '../types.js'

// @babel/traverse ESM 兼容处理
const traverse = (_traverse as any).default || _traverse

/** 语言相关 header key（小写比较） */
const LANGUAGE_HEADER_KEYS = ['accept-language', 'language', 'lang']

/** URL 中的语言查询参数关键字 */
const LANGUAGE_URL_PARAMS = ['lang=', 'language=']

/** 从 AST 节点提取源码片段 */
function getCodeSnippet(node: any, source: string): string {
  if (node.start != null && node.end != null) {
    return source.slice(node.start, node.end)
  }
  return ''
}

/**
 * 收集字符串拼接表达式中所有字符串字面量片段
 * 支持 StringLiteral、TemplateLiteral、BinaryExpression(+) 嵌套
 */
function collectStringFragments(node: any): string[] {
  if (!node) return []

  if (node.type === 'StringLiteral') {
    return [node.value]
  }

  if (node.type === 'TemplateLiteral') {
    return (node.quasis || []).map((q: any) => q.value?.cooked || q.value?.raw || '')
  }

  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return [...collectStringFragments(node.left), ...collectStringFragments(node.right)]
  }

  return []
}

/** 判断 URL 节点是否包含语言查询参数 */
function urlHasLanguageParam(urlNode: any): boolean {
  const fragments = collectStringFragments(urlNode)
  const joined = fragments.join('').toLowerCase()
  return LANGUAGE_URL_PARAMS.some(key => joined.includes(key))
}

/** 判断 ObjectExpression 中的 headers 是否包含语言 key */
function headersHaveLanguageKey(optionsNode: any): boolean {
  if (!optionsNode || optionsNode.type !== 'ObjectExpression') return false

  const headersProp = optionsNode.properties.find(
    (p: any) =>
      p.type === 'ObjectProperty' &&
      ((p.key.type === 'Identifier' && p.key.name === 'headers') ||
        (p.key.type === 'StringLiteral' && p.key.value === 'headers'))
  )

  if (!headersProp || !headersProp.value || headersProp.value.type !== 'ObjectExpression') {
    return false
  }

  return (headersProp.value.properties || []).some((prop: any) => {
    if (prop.type !== 'ObjectProperty' || prop.computed) return false
    const key = prop.key
    let keyName = ''
    if (key.type === 'Identifier') keyName = key.name
    else if (key.type === 'StringLiteral') keyName = key.value
    return LANGUAGE_HEADER_KEYS.includes(keyName.toLowerCase())
  })
}

/**
 * SSE/WebSocket 语言参数检测器
 *
 * 检测 fetchEventSource、new EventSource、new WebSocket 调用是否携带语言参数。
 * 这类请求绕过 axios 拦截器，需手动传递语言参数，否则后端无法识别用户语言。
 */
export class SseWsLocaleChecker {
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

    traverse(ast, {
      // 检测 fetchEventSource(url, options) 缺少语言 header
      CallExpression: (path: any) => {
        const node = path.node
        const callee = node.callee
        if (callee.type !== 'Identifier' || callee.name !== 'fetchEventSource') return

        const optionsArg = node.arguments[1]
        if (headersHaveLanguageKey(optionsArg)) return

        const line = startLine + (node.loc?.start.line || 1) - 1
        const column = node.loc?.start.column || 0
        issues.push({
          type: 'sse-ws-locale-missing',
          filePath,
          line,
          column,
          code: getCodeSnippet(node, scriptContent),
          suggestion:
            'SSE 请求缺少语言 header：在 options.headers 中添加 "Accept-Language": getLanguage() 或 "language": getLanguage()',
        })
      },

      // 检测 new EventSource(url) / new WebSocket(url) 缺少语言查询参数
      NewExpression: (path: any) => {
        const node = path.node
        const callee = node.callee
        if (callee.type !== 'Identifier') return

        const isEventSource = callee.name === 'EventSource'
        const isWebSocket = callee.name === 'WebSocket'
        if (!isEventSource && !isWebSocket) return

        const urlArg = node.arguments[0]
        if (urlHasLanguageParam(urlArg)) return

        const line = startLine + (node.loc?.start.line || 1) - 1
        const column = node.loc?.start.column || 0
        const target = isEventSource ? 'EventSource' : 'WebSocket'
        issues.push({
          type: 'sse-ws-locale-missing',
          filePath,
          line,
          column,
          code: getCodeSnippet(node, scriptContent),
          suggestion: `${target} URL 缺少语言参数：在 URL 中追加 ?lang=\${getLanguage()} 或 ?language=\${getLanguage()}`,
        })
      },
    })

    return issues
  }
}
