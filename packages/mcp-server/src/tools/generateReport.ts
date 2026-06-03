import { CoverageReporter, checkKeyIntegrity } from '@i18n-tool/core'
import type { BaseToolInput } from '../types.js'
import { loadConfig } from '../shared/loadConfig.js'
import { formatCoverageReportMd } from '../shared/formatters.js'
import { existsSync } from 'fs'
import { z } from 'zod'

/**
 * MCP Tool Schema: i18n_generate_report
 */
export const schema = {
  name: 'i18n_generate_report',
  description: '生成 i18n 覆盖率报告（包含文件覆盖率和 key 完整性）',
  inputSchema: {
    path: z.string().describe('项目或目录的绝对路径'),
    configPath: z.string().optional().describe('配置文件路径（可选）'),
  },
}

/**
 * MCP Tool Handler: i18n_generate_report
 */
export async function handler(input: BaseToolInput) {
  try {
    const { path, configPath } = input

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

    // 生成覆盖率报告
    const coverageReporter = new CoverageReporter(config)
    const coverageReport = await coverageReporter.generate(path)

    // 检查 key 完整性
    const keyResult = checkKeyIntegrity(config.langDir, config.locales, config.defaultLocale)

    // 格式化输出
    const markdown = formatCoverageReportMd(coverageReport, keyResult)

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
      isError: true,
    }
  }
}
