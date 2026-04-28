import { readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import type { KeyIntegrityResult, ValidationIssue } from '../types.js'

/**
 * 翻译 Key 完整性检查器
 *
 * 以基准语言为准，检测其他语言包中缺失或多余的 key
 * 支持 flat 和 nested 两种语言包格式
 */
export function checkKeyIntegrity(
  localeDir: string,
  locales: string[],
  baseLocale: string
): KeyIntegrityResult {
  const localeData: Record<string, Record<string, unknown>> = {}

  // 读取所有语言包
  for (const locale of locales) {
    const filePath = resolveLocaleFile(localeDir, locale)
    if (!filePath) {
      continue
    }
    try {
      const content = readFileSync(filePath, 'utf-8')
      localeData[locale] = JSON.parse(content)
    } catch {
      // 解析失败跳过
    }
  }

  // 基准语言不存在则返回空结果
  if (!localeData[baseLocale]) {
    return {
      baseLocale,
      locales,
      totalKeys: 0,
      issues: [],
      localeStats: {},
    }
  }

  const baseKeys = extractKeys(localeData[baseLocale])
  const issues: ValidationIssue[] = []
  const localeStats: KeyIntegrityResult['localeStats'] = {}

  for (const locale of locales) {
    if (locale === baseLocale) continue
    if (!localeData[locale]) continue

    const targetKeys = extractKeys(localeData[locale])
    const baseSet = new Set(baseKeys)
    const targetSet = new Set(targetKeys)

    // 缺失的 key（基准有，目标没有）
    const missingKeys = baseKeys.filter(k => !targetSet.has(k))
    // 多余的 key（目标有，基准没有）
    const extraKeys = targetKeys.filter(k => !baseSet.has(k))

    for (const key of missingKeys) {
      issues.push({
        type: 'missing_translation_key',
        severity: 'error',
        message: `${locale} 缺失翻译 key: ${key}`,
        suggestion: `在 ${locale} 语言包中添加 key "${key}" 的翻译`,
        locale,
        key,
      })
    }

    for (const key of extraKeys) {
      issues.push({
        type: 'extra_translation_key',
        severity: 'warning',
        message: `${locale} 存在多余的 key: ${key}`,
        suggestion: `检查 ${locale} 语言包中的 key "${key}" 是否应该删除，或在基准语言中补充`,
        locale,
        key,
      })
    }

    localeStats[locale] = {
      missing: missingKeys.length,
      extra: extraKeys.length,
      total: targetKeys.length,
    }
  }

  return {
    baseLocale,
    locales,
    totalKeys: baseKeys.length,
    issues,
    localeStats,
  }
}

/**
 * 递归提取对象中所有 key 路径
 * 如 { a: { b: 1, c: 2 } } => ['a.b', 'a.c']
 */
function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

/**
 * 解析语言包文件路径
 * 支持 locale.json 和 locale/ 目录两种格式
 */
function resolveLocaleFile(localeDir: string, locale: string): string | null {
  // 优先查找 locale.json
  const jsonPath = resolve(localeDir, `${locale}.json`)
  if (existsSync(jsonPath)) return jsonPath

  // 查找 locale/index.json
  const indexPath = resolve(localeDir, locale, 'index.json')
  if (existsSync(indexPath)) return indexPath

  return null
}
