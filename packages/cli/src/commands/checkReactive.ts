import { resolve } from 'path'
import { readFileSync } from 'fs'
import { ReactiveChecker, TemplateConcatChecker, ApiLocaleChecker } from '@i18n-tool/adapter-vue3'
import { loadConfig } from '../utils/loadConfig.js'
import { logger } from '../utils/logger.js'
import { spinner } from '../utils/spinner.js'
import { discoverFiles } from '../utils/fileDiscovery.js'

interface CheckReactiveOptions {
  json?: boolean
  config?: string
}

export async function checkReactiveCommand(
  path: string = '.',
  options: CheckReactiveOptions
) {
  const projectRoot = resolve(process.cwd(), path)
  const config = loadConfig(options.config)

  const sp = spinner.start('正在检查响应式问题...')

  try {
    const files = await discoverFiles(projectRoot, ['**/*.vue'], config.scan?.exclude)

    const reactiveChecker = new ReactiveChecker()
    const concatChecker = new TemplateConcatChecker()
    const apiLocaleChecker = new ApiLocaleChecker()
    const reactiveIssues: any[] = []
    const concatIssues: any[] = []
    const apiLocaleIssues: any[] = []

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      reactiveIssues.push(...reactiveChecker.check(content, file))
      concatIssues.push(...concatChecker.check(content, file))
      apiLocaleIssues.push(...apiLocaleChecker.check(content, file))
    }

    sp.succeed('检查完成')

    const totalIssues = reactiveIssues.length + concatIssues.length + apiLocaleIssues.length

    if (options.json) {
      console.log(
        JSON.stringify({ reactiveIssues, concatIssues, apiLocaleIssues, total: totalIssues }, null, 2)
      )
    } else {
      logger.info(`扫描了 ${files.length} 个 Vue 文件`)

      if (reactiveIssues.length > 0) {
        logger.warn(`响应式问题: ${reactiveIssues.length} 个`)
        for (const issue of reactiveIssues) {
          console.log(`  ${issue.filePath}:${issue.line} [${issue.type}]`)
          console.log(`    ${issue.suggestion}`)
        }
      }

      if (concatIssues.length > 0) {
        logger.warn(`模板拼接问题: ${concatIssues.length} 个`)
        for (const issue of concatIssues) {
          console.log(`  ${issue.filePath}:${issue.line} [${issue.type}]`)
          console.log(`    ${issue.suggestion}`)
        }
      }

      if (apiLocaleIssues.length > 0) {
        logger.warn(`API locale 监听问题: ${apiLocaleIssues.length} 个`)
        for (const issue of apiLocaleIssues) {
          console.log(`  ${issue.filePath}:${issue.line} [${issue.type}]`)
          console.log(`    ${issue.suggestion}`)
        }
      }

      if (totalIssues === 0) {
        logger.success('未发现响应式问题')
      }
    }

    process.exit(totalIssues > 0 ? 1 : 0)
  } catch (error) {
    sp.fail('检查失败')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}
