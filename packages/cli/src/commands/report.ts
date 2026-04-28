import { resolve } from 'path'
import { CoverageReporter, checkKeyIntegrity } from '@i18n-tool/core'
import { loadConfig } from '../utils/loadConfig.js'
import { logger } from '../utils/logger.js'
import { spinner } from '../utils/spinner.js'

interface ReportOptions {
  json?: boolean
  config?: string
}

export async function reportCommand(path: string = '.', options: ReportOptions) {
  const projectRoot = resolve(process.cwd(), path)
  const config = loadConfig(options.config)

  const sp = spinner.start('正在生成覆盖率报告...')

  try {
    const reporter = new CoverageReporter(config)
    const report = await reporter.generate(projectRoot)

    // key 完整性统计
    sp.text = '正在检查语言包 key 完整性...'
    const localeDir = resolve(projectRoot, config.localeDir || config.langDir)
    const keyResult = checkKeyIntegrity(
      localeDir,
      config.locales,
      config.defaultLocale
    )

    sp.succeed('报告生成完成')

    if (options.json) {
      console.log(
        JSON.stringify({ coverage: report, keyIntegrity: keyResult }, null, 2)
      )
    } else {
      console.log()
      logger.info(`总文件数: ${report.totalFiles}`)
      logger.info(`包含中文的文件: ${report.filesWithChinese}`)
      logger.info(`总中文字符串: ${report.totalChineseStrings}`)
      logger.info(`已转换: ${report.convertedStrings}`)
      logger.info(`覆盖率: ${report.coverage.toFixed(1)}%`)

      if (report.files.length > 0) {
        console.log()
        logger.info('覆盖率最低的文件:')
        for (const file of report.files.slice(0, 10)) {
          console.log(
            `  ${file.coverage.toFixed(0)}% — ${file.path} (${file.totalStrings} 处)`
          )
        }
      }

      // key 完整性
      if (keyResult.totalKeys > 0) {
        console.log()
        logger.info(`语言包 key 完整性 (基准: ${keyResult.baseLocale}, ${keyResult.totalKeys} keys)`)
        for (const [locale, stats] of Object.entries(keyResult.localeStats)) {
          const status =
            stats.missing === 0 && stats.extra === 0
              ? '完整'
              : `缺失 ${stats.missing}, 多余 ${stats.extra}`
          console.log(`  ${locale}: ${status}`)
        }
      }
    }

    process.exit(0)
  } catch (error) {
    sp.fail('报告生成失败')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}
