import { resolve } from 'path'
import { readFileSync } from 'fs'
import {
  ChinglishChecker,
  RedundancyChecker,
  RtlChecker,
  MenuKeyChecker,
} from '@i18n-tool/core'
import type { QualityIssue } from '@i18n-tool/core'
import { loadConfig } from '../utils/loadConfig.js'
import { logger } from '../utils/logger.js'
import { spinner } from '../utils/spinner.js'
import { discoverFiles } from '../utils/fileDiscovery.js'

interface CheckQualityOptions {
  json?: boolean
  locale?: string
  config?: string
}

export async function checkQualityCommand(
  path: string = '.',
  options: CheckQualityOptions
) {
  const projectRoot = resolve(process.cwd(), path)
  const config = loadConfig(options.config)

  const sp = spinner.start('正在检查翻译质量...')

  try {
    // 收集语言包文件
    const localeDir = resolve(projectRoot, config.localeDir || config.langDir)
    const targetLocales = options.locale
      ? [options.locale]
      : config.locales.filter(l => l !== config.defaultLocale)

    const chinglishChecker = new ChinglishChecker()
    const redundancyChecker = new RedundancyChecker()
    const rtlChecker = new RtlChecker()
    const menuKeyChecker = new MenuKeyChecker()

    const allIssues: Array<QualityIssue & { locale: string; key: string }> = []

    for (const locale of targetLocales) {
      const filePath = resolve(localeDir, `${locale}.json`)
      let data: Record<string, unknown>
      try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'))
      } catch {
        continue
      }

      // 递归提取所有翻译文本
      const entries = extractEntries(data)

      for (const { key, value } of entries) {
        // 检查 key 语义化
        const menuIssues = menuKeyChecker.check(key)
        for (const issue of menuIssues) {
          allIssues.push({ ...issue, locale, key })
        }

        if (typeof value !== 'string') continue

        const chinglish = chinglishChecker.check(value)
        const redundancy = redundancyChecker.check(value)
        const rtl = rtlChecker.check(value, locale)

        for (const issue of [...chinglish, ...redundancy, ...rtl]) {
          allIssues.push({ ...issue, locale, key })
        }
      }
    }

    sp.succeed('质量检查完成')

    if (options.json) {
      console.log(JSON.stringify({ issues: allIssues, total: allIssues.length }, null, 2))
    } else {
      if (allIssues.length > 0) {
        logger.warn(`发现 ${allIssues.length} 个质量问题`)

        // 按严重级别分组
        const errors = allIssues.filter(i => i.severity === 'error')
        const warnings = allIssues.filter(i => i.severity === 'warning')
        const infos = allIssues.filter(i => i.severity === 'info')

        for (const group of [
          { label: 'Error', items: errors },
          { label: 'Warning', items: warnings },
          { label: 'Info', items: infos },
        ]) {
          if (group.items.length === 0) continue
          console.log(`\n  ${group.label} (${group.items.length}):`)
          for (const issue of group.items) {
            console.log(`    [${issue.locale}] ${issue.key}: ${issue.message}`)
            console.log(`      建议: ${issue.suggestion}`)
          }
        }
      } else {
        logger.success('翻译质量良好')
      }
    }

    const hasErrors = allIssues.some(i => i.severity === 'error')
    process.exit(hasErrors ? 1 : 0)
  } catch (error) {
    sp.fail('质量检查失败')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}

function extractEntries(
  obj: Record<string, unknown>,
  prefix = ''
): Array<{ key: string; value: unknown }> {
  const entries: Array<{ key: string; value: unknown }> = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...extractEntries(value as Record<string, unknown>, fullKey))
    } else {
      entries.push({ key: fullKey, value })
    }
  }
  return entries
}
