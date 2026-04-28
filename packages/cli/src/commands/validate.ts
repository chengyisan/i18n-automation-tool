import { resolve } from 'path'
import { ConfigValidator, checkKeyIntegrity } from '@i18n-tool/core'
import { loadConfig } from '../utils/loadConfig.js'
import { logger } from '../utils/logger.js'
import { spinner } from '../utils/spinner.js'

interface ValidateOptions {
  json?: boolean
  config?: string
}

export async function validateCommand(path: string = '.', options: ValidateOptions) {
  const projectRoot = resolve(process.cwd(), path)
  const config = loadConfig(options.config)

  const sp = spinner.start('正在验证配置...')

  try {
    // 验证配置
    const configValidator = new ConfigValidator()
    const configIssues = configValidator.validate(config, projectRoot)

    // 检查语言包 key 完整性
    sp.text = '正在检查语言包 key 完整性...'
    const localeDir = resolve(projectRoot, config.localeDir || config.langDir)
    const keyResult = checkKeyIntegrity(
      localeDir,
      config.locales,
      config.defaultLocale
    )

    sp.succeed('验证完成')

    const allIssues = [...configIssues, ...keyResult.issues]

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            configIssues,
            keyIntegrity: keyResult,
            totalIssues: allIssues.length,
          },
          null,
          2
        )
      )
    } else {
      // 配置验证结果
      if (configIssues.length > 0) {
        logger.warn(`配置问题: ${configIssues.length} 个`)
        for (const issue of configIssues) {
          const prefix = issue.severity === 'error' ? '✖' : '⚠'
          console.log(`  ${prefix} [${issue.type}] ${issue.message}`)
          if (issue.suggestion) {
            console.log(`    建议: ${issue.suggestion}`)
          }
        }
      } else {
        logger.success('配置验证通过')
      }

      // Key 完整性结果
      if (keyResult.totalKeys > 0) {
        console.log()
        logger.info(`基准语言 (${keyResult.baseLocale}) 共 ${keyResult.totalKeys} 个 key`)

        for (const [locale, stats] of Object.entries(keyResult.localeStats)) {
          if (stats.missing === 0 && stats.extra === 0) {
            logger.success(`${locale}: ${stats.total} keys — 完整`)
          } else {
            if (stats.missing > 0) {
              logger.error(`${locale}: 缺失 ${stats.missing} 个 key`)
            }
            if (stats.extra > 0) {
              logger.warn(`${locale}: 多余 ${stats.extra} 个 key`)
            }
          }
        }
      }

      if (allIssues.length === 0) {
        console.log()
        logger.success('所有验证通过')
      }
    }

    const hasErrors = allIssues.some(i => i.severity === 'error')
    process.exit(hasErrors ? 1 : 0)
  } catch (error) {
    sp.fail('验证失败')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}
