import { resolve } from 'path'
import { readFileSync } from 'fs'
import { ChineseScanner, UntranslatableDetector, DuplicateDetector } from '@i18n-tool/core'
import type { ScanResult } from '@i18n-tool/core'
import { loadConfig } from '../utils/loadConfig.js'
import { logger } from '../utils/logger.js'
import { spinner } from '../utils/spinner.js'
import { discoverFiles } from '../utils/fileDiscovery.js'

interface ScanOptions {
  json?: boolean
  includeComments?: boolean
  config?: string
}

export async function scanCommand(path: string = '.', options: ScanOptions) {
  const projectRoot = resolve(process.cwd(), path)
  const config = loadConfig(options.config)

  const sp = spinner.start('正在扫描文件...')

  try {
    const files = await discoverFiles(
      projectRoot,
      config.scan?.include,
      config.scan?.exclude
    )

    sp.text = `找到 ${files.length} 个文件，开始扫描...`

    const scanner = new ChineseScanner(config)
    const untranslatableDetector = new UntranslatableDetector(config)
    const scanResults: ScanResult[] = []

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const result = scanner.scanContent({
        content,
        filePath: file,
        includeComments: options.includeComments,
      })

      const untranslatables = untranslatableDetector.detect(content, file)
      result.untranslatables = untranslatables

      if (result.hardcodedStrings.length > 0 || untranslatables.length > 0) {
        scanResults.push(result)
      }
    }

    // 检测重复翻译
    const duplicateDetector = new DuplicateDetector()
    const duplicates = duplicateDetector.detect(scanResults)

    sp.succeed(`扫描完成`)

    const totalHardcoded = scanResults.reduce(
      (sum, r) => sum + r.hardcodedStrings.length,
      0
    )
    const totalUntranslatable = scanResults.reduce(
      (sum, r) => sum + r.untranslatables.length,
      0
    )

    // 输出结果
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            totalFiles: files.length,
            filesWithIssues: scanResults.length,
            hardcodedStrings: totalHardcoded,
            untranslatables: totalUntranslatable,
            duplicates: duplicates.length,
            results: scanResults,
            duplicateKeys: duplicates,
          },
          null,
          2
        )
      )
    } else {
      logger.info(`扫描了 ${files.length} 个文件`)
      logger.info(`发现 ${scanResults.length} 个文件包含问题`)

      if (totalHardcoded > 0) {
        logger.warn(`硬编码中文: ${totalHardcoded} 处`)
      }
      if (totalUntranslatable > 0) {
        logger.warn(`不可转换中文: ${totalUntranslatable} 处`)
      }
      if (duplicates.length > 0) {
        logger.info(`重复翻译: ${duplicates.length} 个`)
      }

      if (totalHardcoded === 0 && totalUntranslatable === 0) {
        logger.success('未发现问题')
      }
    }

    process.exit(totalHardcoded > 0 || totalUntranslatable > 0 ? 1 : 0)
  } catch (error) {
    sp.fail('扫描失败')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}
