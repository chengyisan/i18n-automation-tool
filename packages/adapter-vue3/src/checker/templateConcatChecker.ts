import { parse as sfcParse } from '@vue/compiler-sfc'
import type { TemplateConcatIssue } from '../types.js'

/**
 * 模板拼接空格检测器
 *
 * 检测 Vue template 中相邻的 {{ t() }} 表达式之间缺少空格分隔
 * 非中文语言需要词间空格，否则会出现单词粘连
 */
export class TemplateConcatChecker {
  check(source: string, filePath: string): TemplateConcatIssue[] {
    const issues: TemplateConcatIssue[] = []

    try {
      const { descriptor } = sfcParse(source, { filename: filePath })

      if (!descriptor.template) {
        return issues
      }

      const templateContent = descriptor.template.content
      const startLine = descriptor.template.loc.start.line

      // 检测相邻的 {{ t() }} 或 {{ $t() }} 表达式
      // 匹配模式：}}{{ 或 }}  {{ （中间只有空格或无空格）
      const pattern = /\{\{\s*\$?t\([^}]+\)\s*\}\}\s*\{\{\s*\$?t\([^}]+\)\s*\}\}/g
      const matches = templateContent.matchAll(pattern)

      for (const match of matches) {
        if (match.index !== undefined) {
          // 计算行号
          const beforeMatch = templateContent.substring(0, match.index)
          const lineNumber = startLine + (beforeMatch.match(/\n/g) || []).length

          issues.push({
            type: 'template-concat-missing-space',
            filePath,
            line: lineNumber,
            code: match[0],
            suggestion: '非中文语言需要词间空格。建议添加 localeSep computed 属性：const localeSep = computed(() => locale.value === \'zh-CN\' ? \'\' : \' \')',
          })
        }
      }
    } catch {
      // 解析失败时返回空数组
    }

    return issues
  }
}
