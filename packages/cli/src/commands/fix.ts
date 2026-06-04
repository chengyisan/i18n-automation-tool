import { resolve, join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import inquirer from 'inquirer'
import { ChineseScanner, UntranslatableDetector } from '@i18n-tool/core'
import { CodeReplacer } from '@i18n-tool/adapter-vue3'
import type { ScanResult } from '@i18n-tool/core'
import { loadConfig } from '../utils/loadConfig.js'
import { logger } from '../utils/logger.js'
import { spinner } from '../utils/spinner.js'
import { discoverFiles } from '../utils/fileDiscovery.js'

interface FixOptions {
  dryRun?: boolean
  auto?: boolean
  file?: string
  json?: boolean
  config?: string
}

interface FixStats {
  totalFiles: number
  modifiedFiles: number
  totalReplacements: number
  addedKeys: number
}

export async function fixCommand(path: string = '.', options: FixOptions) {
  const projectRoot = resolve(process.cwd(), path)
  const config = loadConfig(options.config)

  const sp = spinner.start('正在扫描文件...')

  try {
    // 1. 收集文件
    let files: string[]
    if (options.file) {
      const targetFile = resolve(projectRoot, options.file)
      if (!existsSync(targetFile)) {
        sp.fail('文件不存在')
        logger.error(`文件不存在: ${targetFile}`)
        process.exit(1)
      }
      files = [targetFile]
    } else {
      files = await discoverFiles(projectRoot, config.scan?.include, config.scan?.exclude)
    }

    sp.text = `找到 ${files.length} 个文件，开始扫描硬编码中文...`

    // 2. 扫描硬编码中文
    const scanner = new ChineseScanner(config)
    const untranslatableDetector = new UntranslatableDetector(config)
    const scanResults: ScanResult[] = []

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const result = scanner.scanContent({
        content,
        filePath: file,
      })

      // 过滤掉不可转换的中文
      const untranslatables = untranslatableDetector.detect(content, file)
      const untranslatableTexts = new Set(untranslatables.map((item) => item.text))

      result.hardcodedStrings = result.hardcodedStrings.filter(
        (item) => !untranslatableTexts.has(item.text)
      )

      if (result.hardcodedStrings.length > 0) {
        scanResults.push(result)
      }
    }

    sp.succeed('扫描完成')

    if (scanResults.length === 0) {
      logger.success('未发现可修复的硬编码中文')
      process.exit(0)
    }

    const totalHardcoded = scanResults.reduce((sum, r) => sum + r.hardcodedStrings.length, 0)
    logger.info(`发现 ${scanResults.length} 个文件包含 ${totalHardcoded} 处硬编码中文`)

    // 3. 交互式确认（非 auto 模式）
    let filesToFix = scanResults.map((r) => r.filePath)
    if (!options.auto) {
      // 展示每个文件的硬编码列表
      for (const result of scanResults) {
        logger.info(`\n文件: ${result.filePath}`)
        result.hardcodedStrings.forEach((item, index) => {
          logger.info(`  [${index + 1}] 第 ${item.line} 行: "${item.text}"`)
        })
      }

      const { shouldFix } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldFix',
          message: `是否替换这 ${totalHardcoded} 处硬编码中文为 t() 调用？`,
          default: true,
        },
      ])

      if (!shouldFix) {
        logger.info('已取消')
        process.exit(0)
      }
    }

    // 4. 执行替换
    const replaceSp = spinner.start('正在替换硬编码中文...')
    const replacer = new CodeReplacer()
    const stats: FixStats = {
      totalFiles: filesToFix.length,
      modifiedFiles: 0,
      totalReplacements: 0,
      addedKeys: 0,
    }

    // 收集所有新增的 key-value 对
    const newTranslations: Record<string, string> = {}

    for (const filePath of filesToFix) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        const replacementResult = replacer.replace(content, filePath)

        if (replacementResult.replacements.length === 0) {
          continue
        }

        stats.modifiedFiles += 1
        stats.totalReplacements += replacementResult.replacements.length

        // 收集 key-value 对
        for (const replacement of replacementResult.replacements) {
          newTranslations[replacement.key] = replacement.original
        }

        // 写回文件（非 dry-run 模式）
        if (!options.dryRun) {
          writeFileSync(filePath, replacementResult.modifiedContent, 'utf-8')
        }
      } catch (error) {
        logger.warn(
          `替换失败 ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    stats.addedKeys = Object.keys(newTranslations).length

    // 5. 更新语言包（非 dry-run 模式）
    if (!options.dryRun && stats.addedKeys > 0) {
      try {
        const langDir = config.langDir || 'src/locales'
        const defaultLocale = config.defaultLocale || 'zh-CN'
        const langFilePath = join(projectRoot, langDir, `${defaultLocale}.json`)

        let existingTranslations: Record<string, any> = {}
        if (existsSync(langFilePath)) {
          const content = readFileSync(langFilePath, 'utf-8')
          existingTranslations = JSON.parse(content)
        }

        // 合并翻译（深度合并，支持嵌套 key）
        const mergedTranslations = mergeTranslations(existingTranslations, newTranslations)

        writeFileSync(langFilePath, JSON.stringify(mergedTranslations, null, 2) + '\n', 'utf-8')
        logger.success(`已更新语言包: ${langFilePath}`)
      } catch (error) {
        logger.error(
          `更新语言包失败: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    replaceSp.succeed(options.dryRun ? '替换预览完成（未实际写入）' : '替换完成')

    // 6. 输出结果
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ...stats,
            dryRun: options.dryRun || false,
            translations: newTranslations,
          },
          null,
          2
        )
      )
    } else {
      logger.info(`修改了 ${stats.modifiedFiles} 个文件`)
      logger.info(`替换了 ${stats.totalReplacements} 处硬编码`)
      logger.info(`新增了 ${stats.addedKeys} 个翻译 key`)

      if (options.dryRun) {
        logger.warn('DRY RUN 模式：未实际写入文件')
      } else {
        logger.success('所有硬编码已替换为 t() 调用')
      }
    }

    process.exit(0)
  } catch (error) {
    sp.fail('替换失败')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}

/**
 * 合并翻译对象，支持嵌套 key（如 userProfile.title）
 */
function mergeTranslations(
  existing: Record<string, any>,
  newTranslations: Record<string, string>
): Record<string, any> {
  const merged = { ...existing }

  for (const [key, value] of Object.entries(newTranslations)) {
    const segments = key.split('.')
    let current = merged

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]
      if (!(segment in current)) {
        current[segment] = {}
      } else if (typeof current[segment] !== 'object') {
        // 如果现有值不是对象，转换为对象
        current[segment] = {}
      }
      current = current[segment]
    }

    const lastSegment = segments[segments.length - 1]
    current[lastSegment] = value
  }

  return merged
}
