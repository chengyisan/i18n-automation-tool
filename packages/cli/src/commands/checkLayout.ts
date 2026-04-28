import { resolve } from 'path'
import { LayoutChecker } from '@i18n-tool/core'
import { loadConfig } from '../utils/loadConfig.js'
import { logger } from '../utils/logger.js'
import { spinner } from '../utils/spinner.js'

interface CheckLayoutOptions {
  json?: boolean
  config?: string
}

export async function checkLayoutCommand(
  path: string = '.',
  options: CheckLayoutOptions
) {
  const projectRoot = resolve(process.cwd(), path)
  const config = loadConfig(options.config)

  const sp = spinner.start('正在检查 CSS 布局...')

  try {
    const checker = new LayoutChecker()
    const issues = await checker.check(projectRoot)

    sp.succeed('布局检查完成')

    if (options.json) {
      console.log(JSON.stringify({ issues, total: issues.length }, null, 2))
    } else {
      if (issues.length > 0) {
        logger.warn(`发现 ${issues.length} 个布局问题`)
        for (const issue of issues) {
          console.log(`  ${issue.file} [${issue.type}] ${issue.message}`)
          console.log(`    建议: ${issue.suggestion}`)
        }
      } else {
        logger.success('未发现布局问题')
      }
    }

    process.exit(issues.length > 0 ? 1 : 0)
  } catch (error) {
    sp.fail('布局检查失败')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}
