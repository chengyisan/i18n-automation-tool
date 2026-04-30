import type { QualityIssue } from '../types.js'

/**
 * 菜单 key 语义化检测器
 *
 * 检测 menu.* 或 nav.* 开头的 key 是否使用纯数字而非语义化命名
 */
export class MenuKeyChecker {
  /**
   * 检查 key 是否符合语义化命名规范
   * @param key - 翻译 key
   * @returns 质量问题列表
   */
  check(key: string): QualityIssue[] {
    const issues: QualityIssue[] = []

    // 检测 key 是否以 menu. 或 nav. 开头
    if (!key.startsWith('menu.') && !key.startsWith('nav.')) {
      return issues
    }

    // 检测 key 的最后一段是否为纯数字
    const lastSegment = key.split('.').pop()
    if (lastSegment && /^\d+$/.test(lastSegment)) {
      issues.push({
        type: 'menu-key-semantic',
        severity: 'warning',
        message: `菜单 key "${key}" 使用纯数字命名，不利于维护`,
        suggestion: `使用语义化命名，如 menu.home、nav.about 等`,
      })
    }

    return issues
  }
}
