import { LayoutChecker } from '@i18n-tool/core'
import type { BaseToolInput } from '../types.js'
import type { LayoutIssue } from '@i18n-tool/core'
import { loadConfig } from '../shared/loadConfig.js'
import { discoverFiles } from '../shared/fileDiscovery.js'
import { formatLayoutIssuesMd } from '../shared/formatters.js'
import { existsSync, statSync } from 'fs'
import { z } from 'zod'

/**
 * MCP Tool Schema: i18n_check_layout
 */
export const schema = {
  name: 'i18n_check_layout',
  description: '检查 CSS 固定宽度/高度等多语言布局适配问题',
  inputSchema: {
    path: z.string().describe('项目或目录的绝对路径'),
    configPath: z.string().optional().describe('配置文件路径（可选）'),
  },
}

/**
 * MCP Tool Handler: i18n_check_layout
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

    // 判断是单文件还是目录
    const stat = statSync(path)
    const files = stat.isFile()
      ? [path]
      : await discoverFiles(path, config.scan?.include, config.scan?.exclude)

    // 初始化检查器
    const layoutChecker = new LayoutChecker()

    // 检查所有文件
    const allIssues: LayoutIssue[] = []

    for (const filePath of files) {
      const issues = await layoutChecker.check(filePath)
      allIssues.push(...issues)
    }

    // 格式化输出
    const markdown = formatLayoutIssuesMd(allIssues)

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
