import { parse as sfcParse } from '@vue/compiler-sfc'
import { parse as babelParse } from '@babel/parser'
import _traverse from '@babel/traverse'
import type { ReactiveIssue } from '../types.js'

// @babel/traverse ESM 兼容处理
const traverse = (_traverse as any).default || _traverse

/**
 * 碎片化翻译检测器
 *
 * 检测将完整句子拆分成多个 t() 拼接的问题
 * 这会导致各语种语法不通、词序错乱
 */
export class FragmentedTranslationChecker {
  check(source: string, filePath: string): ReactiveIssue[] {
    const issues: ReactiveIssue[] = []

    try {
      const { descriptor } = sfcParse(source, { filename: filePath })

      // 检查 template 块
      if (descriptor.template) {
        issues.push(...this.checkTemplate(descriptor.template.content, filePath, descriptor.template.loc.start.line))
      }

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

  /**
   * 检查 template 中的碎片化翻译
   * 匹配模式：{{ t('...') }} 空格/变量 {{ t('...') }}
   * 或者：{{ t('...') }}{{ 变量 }}{{ t('...') }}
   */
  private checkTemplate(templateContent: string, filePath: string, startLine: number): ReactiveIssue[] {
    const issues: ReactiveIssue[] = []

    // 正则模式：检测包含多个 t() 调用的插值表达式序列
    // 匹配：{{ t() }}{{ 任意 }}{{ t() }} 或 {{ t() }} 任意文本 {{ t() }}
    const pattern = /\{\{\s*\$?t\([^}]+\)\s*\}\}[\s\S]*?\{\{\s*\$?t\([^}]+\)\s*\}\}/g
    const matches = templateContent.matchAll(pattern)

    for (const match of matches) {
      if (match.index !== undefined) {
        const matchedText = match[0]

        // 排除：中间有实际的文本内容（非空格、非插值变量）
        // 例如：{{ t('a') }} - {{ t('b') }} 不应该报告
        const betweenParts = matchedText.replace(/\{\{\s*\$?t\([^}]+\)\s*\}\}/g, '')
        const hasSeparatorText = /[^{}\s]/.test(betweenParts.replace(/\{\{[^}]*\}\}/g, ''))

        if (hasSeparatorText) {
          // 有分隔符文本，可能是合理的布局，跳过
          continue
        }

        // 计算行号
        const beforeMatch = templateContent.substring(0, match.index)
        const lineNumber = startLine + (beforeMatch.match(/\n/g) || []).length

        // 提取完整的代码片段（最多显示 100 个字符）
        const code = matchedText.length > 100 ? matchedText.substring(0, 100) + '...' : matchedText

        issues.push({
          type: 'fragmented-translation',
          filePath,
          line: lineNumber,
          column: 0,
          code,
          suggestion: '建议：将多个 t() 拼接合并为单个 key，使用插值变量 {variable} 传递动态内容。例如：t("message", { name, count })',
        })
      }
    }

    return issues
  }

  /**
   * 检查 script 中的碎片化翻译
   * 检测 BinaryExpression 中包含多个 t() 调用
   */
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

    // 遍历 AST，查找 BinaryExpression（+ 运算符）
    const self = this
    traverse(ast, {
      BinaryExpression(path: any) {
        const node = path.node

        // 只检测字符串拼接（+ 运算符）
        if (node.operator !== '+') return

        // 收集拼接表达式中的所有操作数
        const parts = self.collectBinaryParts(node)

        // 统计 t() 调用的数量
        const tCallCount = parts.filter(part => self.isTCall(part)).length

        // 如果有 2 个及以上的 t() 调用，报告问题
        if (tCallCount >= 2) {
          const line = startLine + (node.loc?.start.line || 1) - 1
          const column = node.loc?.start.column || 0
          const code = self.getCodeSnippet(node, scriptContent)

          issues.push({
            type: 'fragmented-translation',
            filePath,
            line,
            column,
            code,
            suggestion: '建议：将多个 t() 拼接合并为单个 key，使用插值变量 {variable} 传递动态内容。例如：t("message", { name, count })',
          })
        }
      },
    })

    return issues
  }

  /** 递归收集 BinaryExpression 的所有操作数 */
  private collectBinaryParts(node: any): any[] {
    if (node.type !== 'BinaryExpression' || node.operator !== '+') {
      return [node]
    }

    const leftParts = this.collectBinaryParts(node.left)
    const rightParts = this.collectBinaryParts(node.right)

    return [...leftParts, ...rightParts]
  }

  /** 判断节点是否为 t() 或 $t() 调用 */
  private isTCall(node: any): boolean {
    if (!node || node.type !== 'CallExpression') return false

    const callee = node.callee
    if (callee.type === 'Identifier' && (callee.name === 't' || callee.name === '$t')) {
      return true
    }

    return false
  }

  /** 从 AST 节点提取源码片段 */
  private getCodeSnippet(node: any, source: string): string {
    if (node.start != null && node.end != null) {
      const snippet = source.slice(node.start, node.end)
      // 限制长度，避免过长
      return snippet.length > 100 ? snippet.substring(0, 100) + '...' : snippet
    }
    return ''
  }
}
