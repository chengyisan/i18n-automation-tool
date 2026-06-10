import { parse as sfcParse } from '@vue/compiler-sfc'
import type { MaxlengthIssue } from '../types.js'

/**
 * 表单 maxlength 动态适配检测器
 *
 * 检测 Element Plus 表单组件（el-input/el-textarea/el-input-number）上
 * 固定数值字面量的 maxlength 属性（如 maxlength="20"），提示按 locale
 * 动态调整——长语种（英文等）通常比中文长 30-50%，固定值会限制输入。
 *
 * 覆盖场景：
 *   <el-input maxlength="20" />
 *   <el-textarea maxlength="50" />
 *
 * 不覆盖：
 *   - 动态绑定 :maxlength="xxx"（无法静态判断是否已适配，正则天然不匹配冒号形式）
 *   - 原生 <input maxlength>（业务以 Element Plus 为主，留待后续）
 *   - maxlength > 阈值（视为开发者已为多语言留余量）
 */
export class MaxlengthChecker {
  // 超过此阈值视为已留余量，不报告
  private readonly threshold = 50

  // Element Plus 表单组件 + 固定 maxlength 数值字面量
  // \bmaxlength 前的 \b 避免匹配 :maxlength（冒号不是单词边界字符，但 : 前缀会被排除）
  private readonly patterns: RegExp[] = [
    /<el-input\s[^>]*?\bmaxlength\s*=\s*"(\d+)"/g,
    /<el-textarea\s[^>]*?\bmaxlength\s*=\s*"(\d+)"/g,
    /<el-input-number\s[^>]*?\bmaxlength\s*=\s*"(\d+)"/g,
  ]

  check(source: string, filePath: string): MaxlengthIssue[] {
    const issues: MaxlengthIssue[] = []

    let templateContent: string
    let startLine: number
    try {
      const { descriptor } = sfcParse(source, { filename: filePath })
      if (!descriptor.template) return issues
      templateContent = descriptor.template.content
      startLine = descriptor.template.loc.start.line
    } catch {
      return issues
    }

    for (const pattern of this.patterns) {
      pattern.lastIndex = 0
      const matches = templateContent.matchAll(pattern)
      for (const match of matches) {
        if (match.index === undefined) continue

        // 排除动态绑定 :maxlength="..."：检查 maxlength 前一个字符是否为冒号
        const maxlengthIdx = match[0].lastIndexOf('maxlength')
        const charBefore = match[0][maxlengthIdx - 1]
        if (charBefore === ':') continue

        const currentValue = Number(match[1])
        if (currentValue > this.threshold) continue

        const beforeMatch = templateContent.substring(0, match.index)
        const lineNumber = startLine + (beforeMatch.match(/\n/g) || []).length

        issues.push({
          type: 'maxlength-fixed',
          filePath,
          line: lineNumber,
          code: match[0],
          currentValue,
          suggestion: `固定 maxlength=${currentValue} 可能限制长语种用户输入。建议改为 :maxlength="dynamicMaxlength" 按 locale 适配：CJK 语言保持原值，其他语言放大 2-3 倍。`,
        })
      }
    }

    issues.sort((a, b) => a.line - b.line)
    return issues
  }
}
