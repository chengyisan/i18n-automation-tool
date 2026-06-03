import { ChineseScanner, UntranslatableDetector, DuplicateDetector } from '@i18n-tool/core'
import type { ScanToolInput } from '../types.js'
import type { ScanResult } from '@i18n-tool/core'
import { loadConfig } from '../shared/loadConfig.js'
import { discoverFiles } from '../shared/fileDiscovery.js'
import { formatScanResultMd } from '../shared/formatters.js'
import { readFileSync, statSync, existsSync } from 'fs'
import { z } from 'zod'

/**
 * MCP Tool Schema: i18n_scan_hardcoded
 */
export const schema = {
  name: 'i18n_scan_hardcoded',
  description: '扫描硬编码中文字符串、不可转换中文、重复翻译',
  inputSchema: {
    path: z.string().describe('项目或目录的绝对路径'),
    includeComments: z.boolean().optional().describe('是否包含注释中的中文（默认 false）'),
    configPath: z.string().optional().describe('配置文件路径（可选）'),
  },
}

/**
 * MCP Tool Handler: i18n_scan_hardcoded
 */
export async function handler(input: ScanToolInput) {
  try {
    const { path, includeComments = false, configPath } = input

    // 检查路径是否存在
    if (!existsSync(path)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `## ❌ 错误\n\n路径不存在: ${path}`,
          },
        ],
      }
    }

    // 加载配置
    const config = loadConfig(path, configPath)

    // 判断是单文件还是目录
    const stat = statSync(path)
    const files = stat.isFile()
      ? [path]
      : await discoverFiles(path, config.scan?.include, config.scan?.exclude)

    // 初始化扫描器
    const scanner = new ChineseScanner(config)
    const untranslatableDetector = new UntranslatableDetector(config)
    const duplicateDetector = new DuplicateDetector()

    // 扫描所有文件
    const scanResults: ScanResult[] = []

    for (const filePath of files) {
      const content = readFileSync(filePath, 'utf-8')

      // 扫描硬编码中文
      const scanResult = scanner.scanContent({
        content,
        filePath,
        includeComments,
      })

      // 检测不可转换中文
      const untranslatable = untranslatableDetector.detect(content, filePath)

      scanResults.push({
        filePath,
        hardcodedStrings: scanResult.hardcodedStrings,
        untranslatables: untranslatable,
        duplicates: [], // 重复检测需要跨文件汇总
      })
    }

    // 汇总所有硬编码中文和不可转换中文
    const allHardcoded = scanResults.flatMap((r) => r.hardcodedStrings)
    const allUntranslatable = scanResults.flatMap((r) => r.untranslatables)

    // 检测重复翻译（跨文件汇总）
    const duplicates = duplicateDetector.detect(scanResults)

    // 格式化输出
    const markdown = formatScanResultMd(allHardcoded, allUntranslatable, duplicates)

    return {
      content: [{ type: 'text' as const, text: markdown }],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `## ❌ 错误\n\n${(error as Error).message}`,
        },
      ],
    }
  }
}

