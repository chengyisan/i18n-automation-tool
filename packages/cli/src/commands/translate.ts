import { resolve, join } from 'path'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { ApiTranslator, CacheManager, ChinglishChecker, RedundancyChecker } from '@i18n-tool/core'
import type { TranslationResult, QualityIssue } from '@i18n-tool/core'
import { loadConfig } from '../utils/loadConfig.js'
import { logger } from '../utils/logger.js'
import { spinner } from '../utils/spinner.js'

interface TranslateOptions {
  locale?: string
  dryRun?: boolean
  json?: boolean
  config?: string
}

interface TranslateStats {
  totalLocales: number
  translatedKeys: number
  qualityIssues: number
  fromCache: number
}

export async function translateCommand(path: string = '.', options: TranslateOptions) {
  const projectRoot = resolve(process.cwd(), path)
  const config = loadConfig(options.config)

  // 验证翻译配置
  if (!config.translation?.apiKey) {
    logger.error('缺少翻译 API Key，请在配置文件中设置 translation.apiKey 或通过环境变量 I18N_TRANSLATE_API_KEY 提供')
    process.exit(1)
  }

  const sp = spinner.start('正在初始化翻译器...')

  try {
    // 1. 初始化翻译器和缓存
    const cacheManager = config.cache
      ? new CacheManager({
          path: join(projectRoot, config.cache.path || '.i18n-cache/translations.db'),
          ttl: config.cache.ttl || 0,
        })
      : undefined

    const translator = new ApiTranslator(
      {
        provider: config.translation.provider || 'google',
        apiKey: config.translation.apiKey,
        retries: config.translation.retries || 3,
      },
      cacheManager
    )

    // 2. 读取基准语言包
    const langDir = config.langDir || 'src/locales'
    const defaultLocale = config.defaultLocale || 'zh-CN'
    const defaultLangFilePath = join(projectRoot, langDir, `${defaultLocale}.json`)

    if (!existsSync(defaultLangFilePath)) {
      sp.fail('语言包不存在')
      logger.error(`基准语言包不存在: ${defaultLangFilePath}`)
      process.exit(1)
    }

    const baseTranslations = JSON.parse(readFileSync(defaultLangFilePath, 'utf-8'))
    const flatBaseTranslations = flattenObject(baseTranslations)

    sp.text = `找到 ${Object.keys(flatBaseTranslations).length} 个翻译 key`

    if (Object.keys(flatBaseTranslations).length === 0) {
      sp.succeed('基准语言包为空，无需翻译')
      process.exit(0)
    }

    // 3. 确定目标语言
    let targetLocales = config.locales.filter((locale) => locale !== defaultLocale)
    if (options.locale) {
      if (!config.locales.includes(options.locale)) {
        sp.fail('目标语言不在配置中')
        logger.error(`目标语言 ${options.locale} 不在 config.locales 中`)
        process.exit(1)
      }
      targetLocales = [options.locale]
    }

    if (targetLocales.length === 0) {
      sp.succeed('没有需要翻译的目标语言')
      process.exit(0)
    }

    sp.text = `准备翻译到 ${targetLocales.length} 个目标语言`

    // 4. 翻译到每个目标语言
    const stats: TranslateStats = {
      totalLocales: targetLocales.length,
      translatedKeys: 0,
      qualityIssues: 0,
      fromCache: 0,
    }

    const allQualityIssues: Array<{ locale: string; key: string; issues: QualityIssue[] }> = []

    for (const targetLocale of targetLocales) {
      const targetLangFilePath = join(projectRoot, langDir, `${targetLocale}.json`)

      // 读取现有翻译
      let existingTranslations: Record<string, any> = {}
      if (existsSync(targetLangFilePath)) {
        existingTranslations = JSON.parse(readFileSync(targetLangFilePath, 'utf-8'))
      }

      const flatExistingTranslations = flattenObject(existingTranslations)

      // 找出缺失的 key
      const missingKeys = Object.keys(flatBaseTranslations).filter(
        (key) => !(key in flatExistingTranslations)
      )

      if (missingKeys.length === 0) {
        logger.info(`${targetLocale}: 无需翻译`)
        continue
      }

      sp.text = `正在翻译 ${targetLocale} (${missingKeys.length} 个 key)...`

      // 批量翻译
      const textsToTranslate = missingKeys.map((key) => flatBaseTranslations[key])
      const translationResults = await translator.translateBatch(
        textsToTranslate,
        defaultLocale,
        targetLocale
      )

      // 统计缓存命中率
      const cacheHits = translationResults.filter((r) => r.fromCache).length
      stats.fromCache += cacheHits

      // 质量检查
      const chinglishChecker = new ChinglishChecker()
      const redundancyChecker = new RedundancyChecker()

      for (let i = 0; i < missingKeys.length; i++) {
        const key = missingKeys[i]
        const translatedText = translationResults[i].translatedText

        // 更新翻译
        flatExistingTranslations[key] = translatedText
        stats.translatedKeys++

        // 质量检查（仅针对英文翻译）
        if (targetLocale.startsWith('en')) {
          const chinglishIssues = chinglishChecker.check(translatedText)
          const redundancyIssues = redundancyChecker.check(translatedText)
          const issues = [...chinglishIssues, ...redundancyIssues]

          if (issues.length > 0) {
            stats.qualityIssues += issues.length
            allQualityIssues.push({ locale: targetLocale, key, issues })
          }
        }
      }

      // 写回语言包（非 dry-run 模式）
      if (!options.dryRun) {
        const unflattenedTranslations = unflattenObject(flatExistingTranslations)
        writeFileSync(
          targetLangFilePath,
          JSON.stringify(unflattenedTranslations, null, 2) + '\n',
          'utf-8'
        )
      }

      logger.success(
        `${targetLocale}: 翻译了 ${missingKeys.length} 个 key${cacheHits > 0 ? ` (${cacheHits} 个来自缓存)` : ''}`
      )
    }

    sp.succeed(options.dryRun ? '翻译预览完成（未实际写入）' : '翻译完成')

    // 5. 输出结果
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ...stats,
            dryRun: options.dryRun || false,
            qualityIssues: allQualityIssues,
          },
          null,
          2
        )
      )
    } else {
      logger.info(`翻译了 ${stats.totalLocales} 个目标语言`)
      logger.info(`新增了 ${stats.translatedKeys} 个翻译`)
      if (stats.fromCache > 0) {
        logger.info(`缓存命中: ${stats.fromCache} 个`)
      }

      if (stats.qualityIssues > 0) {
        logger.warn(`翻译质量问题: ${stats.qualityIssues} 个`)
        logger.info('建议人工审核以下翻译:')
        for (const { locale, key, issues } of allQualityIssues.slice(0, 5)) {
          logger.warn(`  [${locale}] ${key}: ${issues[0].message}`)
        }
        if (allQualityIssues.length > 5) {
          logger.info(`  ... 还有 ${allQualityIssues.length - 5} 个问题`)
        }
      }

      if (options.dryRun) {
        logger.warn('DRY RUN 模式：未实际写入文件')
      } else {
        logger.success('所有语言包已更新')
      }
    }

    // 清理缓存
    if (cacheManager) {
      cacheManager.close()
    }

    process.exit(0)
  } catch (error) {
    sp.fail('翻译失败')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}

/**
 * 扁平化嵌套对象，将 { a: { b: 'c' } } 转换为 { 'a.b': 'c' }
 */
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey))
    } else if (typeof value === 'string') {
      result[fullKey] = value
    }
  }

  return result
}

/**
 * 反扁平化对象，将 { 'a.b': 'c' } 转换为 { a: { b: 'c' } }
 */
function unflattenObject(flat: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(flat)) {
    const segments = key.split('.')
    let current = result

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]
      if (!(segment in current)) {
        current[segment] = {}
      }
      current = current[segment]
    }

    const lastSegment = segments[segments.length - 1]
    current[lastSegment] = value
  }

  return result
}
