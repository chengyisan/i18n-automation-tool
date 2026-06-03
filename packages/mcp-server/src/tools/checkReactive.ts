import { ReactiveChecker, TemplateConcatChecker } from '@i18n-tool/adapter-vue3'
import type { BaseToolInput } from '../types.js'
import type { ReactiveIssue, TemplateConcatIssue } from '@i18n-tool/adapter-vue3'
import { loadConfig } from '../shared/loadConfig.js'
import { discoverFiles } from '../shared/fileDiscovery.js'
import { formatReactiveIssuesMd } from '../shared/formatters.js'
import { readFileSync, statSync, existsSync } from 'fs'
import { z } from 'zod'

/**
 * MCP Tool Schema: i18n_check_reactive
 */
export const schema = {
  name: 'i18n_check_reactive',
  description: '检查 Vue 文件中的响应式问题和模板拼接问题',
  inputSchema: {
    path: z.string().describe('项目、目录或 Vue 文件的绝对路径'),
    configPath: z.string().optional().describe('配置文件路径（可选）'),
  },
}

/**
 * MCP Tool Handler: i18n_check_reactive
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
    let files: string[] = []

    if (stat.isFile()) {
      // 单文件：检查是否为 .vue 文件
      if (!path.endsWith('.vue')) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `## ❌ 错误\n\n不是 Vue 文件: ${path}`,
            },
          ],
        }
      }
      files = [path]
    } else {
      // 目录：查找所有 .vue 文件
      const allFiles = await discoverFiles(path, config.scan?.include, config.scan?.exclude)
      files = allFiles.filter(f => f.endsWith('.vue'))
    }

    // 初始化检查器
    const reactiveChecker = new ReactiveChecker()
    const concatChecker = new TemplateConcatChecker()

    // 检查所有文件
    const allReactiveIssues: ReactiveIssue[] = []
    const allConcatIssues: TemplateConcatIssue[] = []

    for (const filePath of files) {
      const content = readFileSync(filePath, 'utf-8')

      // 检测响应式问题
      const reactiveIssues = reactiveChecker.check(content, filePath)
      allReactiveIssues.push(...reactiveIssues)

      // 检测模板拼接问题
      const concatIssues = concatChecker.check(content, filePath)
      allConcatIssues.push(...concatIssues)
    }

    // 格式化输出
    const markdown = formatReactiveIssuesMd(allReactiveIssues, allConcatIssues)

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
