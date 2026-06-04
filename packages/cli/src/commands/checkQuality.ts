import { resolve } from 'path'
import { readFileSync } from 'fs'
import {
  ChinglishChecker,
  RedundancyChecker,
  RtlChecker,
  MenuKeyChecker,
  BackendContractChecker,
  LocaleConstantChecker,
} from '@i18n-tool/core'
import type { QualityIssue } from '@i18n-tool/core'
import { FragmentedTranslationChecker } from '@i18n-tool/adapter-vue3'
import type { ReactiveIssue } from '@i18n-tool/adapter-vue3'
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
    const fragmentedChecker = new FragmentedTranslationChecker()
    const backendContractChecker = new BackendContractChecker()
    const localeConstantChecker = new LocaleConstantChecker()

    const allIssues: Array<QualityIssue & { locale: string; key: string }> = []
    const fragmentedIssues: ReactiveIssue[] = []
    const backendContractIssues: QualityIssue[] = []
    const localeConstantIssues: QualityIssue[] = []

    // 扫描 Vue 文件（碎片化翻译拼接检测）
    const vueFiles = await discoverFiles(projectRoot, ['**/*.vue'], config.scan?.exclude)
    for (const vueFile of vueFiles) {
      const content = readFileSync(vueFile, 'utf-8')
      fragmentedIssues.push(...fragmentedChecker.check(content, vueFile))
    }

    for (const locale of targetLocales) {
      const filePath = resolve(localeDir, `${locale}.json`)
      let data: Record<string, unknown>
      try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'))
      } catch {
        continue
      }

      // 后端约定值检测
      backendContractIssues.push(...backendContractChecker.check(filePath))

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

    // 扫描源码文件（默认语言常量检测）
    const sourceFiles = await discoverFiles(
      projectRoot,
      ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
      [...(config.scan?.exclude || []), '**/node_modules/**', '**/dist/**', '**/.git/**']
    )
    for (const sourceFile of sourceFiles) {
      const content = readFileSync(sourceFile, 'utf-8')
      localeConstantIssues.push(...localeConstantChecker.check(sourceFile, content))
    }

    sp.succeed('质量检查完成')

    const totalIssues =
      allIssues.length +
      fragmentedIssues.length +
      backendContractIssues.length +
      localeConstantIssues.length

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            issues: allIssues,
            fragmentedTranslation: fragmentedIssues,
            backendContract: backendContractIssues,
            localeConstant: localeConstantIssues,
            total: totalIssues,
          },
          null,
          2
        )
      )
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

      // 新增问题输出
      if (fragmentedIssues.length > 0) {
        logger.warn(`\n碎片化翻译拼接: ${fragmentedIssues.length} 个`)
        for (const issue of fragmentedIssues.slice(0, 10)) {
          console.log(`  ${issue.filePath}:${issue.line} [${issue.type}]`)
          console.log(`    ${issue.suggestion}`)
        }
        if (fragmentedIssues.length > 10) {
          console.log(`  ... 还有 ${fragmentedIssues.length - 10} 个问题`)
        }
      }

      if (backendContractIssues.length > 0) {
        logger.warn(`\n后端约定值: ${backendContractIssues.length} 个`)
        for (const issue of backendContractIssues.slice(0, 10)) {
          console.log(`  ${issue.context}`)
          console.log(`    ${issue.suggestion}`)
        }
        if (backendContractIssues.length > 10) {
          console.log(`  ... 还有 ${backendContractIssues.length - 10} 个问题`)
        }
      }

      if (localeConstantIssues.length > 0) {
        logger.warn(`\n默认语言硬编码: ${localeConstantIssues.length} 个`)
        for (const issue of localeConstantIssues.slice(0, 10)) {
          console.log(`  ${issue.context}`)
          console.log(`    ${issue.suggestion}`)
        }
        if (localeConstantIssues.length > 10) {
          console.log(`  ... 还有 ${localeConstantIssues.length - 10} 个问题`)
        }
      }

      if (totalIssues > 0) {
        logger.warn(`\n总计: ${totalIssues} 个问题`)
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
