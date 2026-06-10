import { parse as sfcParse } from '@vue/compiler-sfc'
import type { ImageI18nIssue } from '../types.js'

/**
 * 图片资源多语言检测器
 *
 * 检测 Vue template 中静态 <img> 路径含中文（CJK）字符的资源引用，
 * 提示按 locale 动态切换图片资源（如 banner_en.png）。
 *
 * 覆盖场景：
 *   <img src="@/assets/欢迎.png" />
 *   <img :src="require('@/assets/产品介绍.svg')" />
 *   <img :src="'@/assets/标题图.jpg'" />
 *
 * 不覆盖：
 *   - 动态绑定 :src="变量"（变量值无法静态判断）
 *   - 通过 import 引入的图片模块（跨语句静态分析复杂）
 *   - 文件名后缀已含语言标识（如 banner_en.png 视为已多语言）
 */
export class ImageI18nChecker {
  // 中文字符（CJK 统一表意文字）
  private readonly cjkPattern = /[\u4e00-\u9fff]/

  // 已含语言后缀的文件名（豁免）
  // 匹配 _zh.png / _en.svg / -en.jpg / _zh-CN.png 等
  private readonly localeSuffixPattern =
    /[_-](zh|en|cn|us|ar|ja|ko|fr|de|es|ru|pt|it)(?:[-_][a-zA-Z]+)?\.[a-zA-Z]+$/

  // 三类 <img> src 提取正则（按优先级匹配）
  // 注意：同一个 <img> 标签只可能命中一种形式，按 require → 字面量绑定 → 普通 src 顺序判断
  private readonly imgPatterns: Array<{ pattern: RegExp; group: number }> = [
    // <img :src="require('xxx')" /> — 必须先匹配，避免被普通 src 模式误吃
    { pattern: /<img\s[^>]*?:src\s*=\s*"require\(\s*['"]([^'"]+)['"]\s*\)"/g, group: 1 },
    // <img :src="'xxx'" /> 或 <img :src='"xxx"' /> — 字面量绑定
    { pattern: /<img\s[^>]*?:src\s*=\s*"\s*'([^']+)'\s*"/g, group: 1 },
    // <img src="xxx" /> — 普通字符串路径
    { pattern: /<img\s[^>]*?\bsrc\s*=\s*"([^"]+)"/g, group: 1 },
  ]

  check(source: string, filePath: string): ImageI18nIssue[] {
    const issues: ImageI18nIssue[] = []

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

    // 记录已处理的 match 位置，避免同一个 <img> 被多个正则重复报告
    const reportedRanges: Array<[number, number]> = []

    for (const { pattern, group } of this.imgPatterns) {
      // 每次循环都要重置 lastIndex（共享 RegExp 对象）
      pattern.lastIndex = 0
      const matches = templateContent.matchAll(pattern)
      for (const match of matches) {
        if (match.index === undefined) continue
        const matchStart = match.index
        const matchEnd = matchStart + match[0].length

        // 已被前序 pattern 覆盖则跳过
        if (reportedRanges.some(([s, e]) => matchStart >= s && matchEnd <= e)) {
          continue
        }

        const src = match[group]
        if (!this.isProblematic(src)) continue

        reportedRanges.push([matchStart, matchEnd])

        const beforeMatch = templateContent.substring(0, matchStart)
        const lineNumber = startLine + (beforeMatch.match(/\n/g) || []).length

        issues.push({
          type: 'image-i18n-missing',
          filePath,
          line: lineNumber,
          code: match[0],
          suggestion: `图片路径 "${src}" 含中文，建议按 locale 动态切换。参考：const imgSrc = computed(() => locale.value === 'zh-CN' ? require('@/assets/xxx.png') : require('@/assets/xxx_en.png'))`,
        })
      }
    }

    // 按行号排序，输出更稳定
    issues.sort((a, b) => a.line - b.line)
    return issues
  }

  /** 判断 src 是否需要报告：含中文 且 未带语言后缀 */
  private isProblematic(src: string): boolean {
    if (!this.cjkPattern.test(src)) return false
    if (this.localeSuffixPattern.test(src)) return false
    return true
  }
}
