import type { QualityIssue } from '../types';

/**
 * RTL 语言拼接问题检测器
 *
 * 检测 RTL（从右到左）语言中的字符串拼接问题
 * RTL 语言包括：阿拉伯语(ar)、希伯来语(he)、波斯语(fa)、乌尔都语(ur)
 */
export class RtlChecker {
  private rtlLanguages = ['ar', 'he', 'fa', 'ur'];

  /**
   * 检查是否为 RTL 语言
   */
  private isRtlLanguage(locale: string): boolean {
    const lang = locale.split('-')[0].toLowerCase();
    return this.rtlLanguages.includes(lang);
  }

  /**
   * 检测字符串拼接模式
   */
  private detectConcatenation(text: string): Array<{ start: number; end: number; pattern: string }> {
    const patterns = [
      // 模板字符串拼接：${var} + text
      /\$\{[^}]+\}\s*\+\s*['"`][^'"`]+['"`]/g,
      // 文本 + 变量拼接：text + ${var}
      /['"`][^'"`]+['"`]\s*\+\s*\$\{[^}]+\}/g,
      // 模板字符串整体拼接：`text ${var}` + "text"
      /`[^`]*\$\{[^}]+\}[^`]*`\s*\+\s*['"`][^'"`]+['"`]/g,
      // 字符串 + 模板字符串："text" + `text ${var}`
      /['"`][^'"`]+['"`]\s*\+\s*`[^`]*\$\{[^}]+\}[^`]*`/g,
      // 普通字符串拼接：'text' + variable
      /['"`][^'"`]+['"`]\s*\+\s*\w+/g,
      // 变量 + 字符串拼接：variable + 'text'
      /\w+\s*\+\s*['"`][^'"`]+['"`]/g,
    ];

    const results: Array<{ start: number; end: number; pattern: string }> = [];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          results.push({
            start: match.index,
            end: match.index + match[0].length,
            pattern: match[0],
          });
        }
      }
    }

    return results;
  }

  /**
   * 检查 RTL 语言的拼接问题
   */
  check(text: string, locale: string): QualityIssue[] {
    // 只检查 RTL 语言
    if (!this.isRtlLanguage(locale)) {
      return [];
    }

    const issues: QualityIssue[] = [];
    const concatenations = this.detectConcatenation(text);

    for (const concat of concatenations) {
      issues.push({
        type: 'rtl',
        severity: 'error',
        message: `RTL 语言不应使用字符串拼接`,
        suggestion: `使用插值变量代替拼接，如 "Hello {name}" 而不是 "Hello " + name`,
        position: {
          start: concat.start,
          end: concat.end,
        },
        context: text.substring(
          Math.max(0, concat.start - 20),
          Math.min(text.length, concat.end + 20)
        ),
      });
    }

    return issues;
  }

  /**
   * 检查翻译键值对中的 RTL 问题
   */
  checkTranslations(
    translations: Record<string, string>,
    locale: string
  ): QualityIssue[] {
    if (!this.isRtlLanguage(locale)) {
      return [];
    }

    const issues: QualityIssue[] = [];

    for (const [key, value] of Object.entries(translations)) {
      // 检查是否包含插值变量
      const hasInterpolation = /\{[^}]+\}/.test(value);

      if (hasInterpolation) {
        // 检查插值变量周围是否有空格
        const noSpacePattern = /\S\{[^}]+\}|\{[^}]+\}\S/g;
        const matches = value.matchAll(noSpacePattern);

        for (const match of matches) {
          if (match.index !== undefined) {
            issues.push({
              type: 'rtl',
              severity: 'warning',
              message: `RTL 语言的插值变量周围应该有空格`,
              suggestion: `在 {${key}} 的插值变量前后添加空格`,
              position: {
                start: match.index,
                end: match.index + match[0].length,
              },
              context: value,
            });
          }
        }
      }
    }

    return issues;
  }
}
