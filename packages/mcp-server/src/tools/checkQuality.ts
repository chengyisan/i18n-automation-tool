import { ChinglishChecker, RedundancyChecker, RtlChecker, MenuKeyChecker } from '@i18n-tool/core'
import type { QualityToolInput } from '../types.js'
import type { QualityIssue } from '@i18n-tool/core'
import { loadConfig } from '../shared/loadConfig.js'
import { formatQualityIssuesMd } from '../shared/formatters.js'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'

/**
 * MCP Tool Schema: i18n_check_quality
 */
export const schema = {
  name: 'i18n_check_quality',
  description: '检查翻译质量（中式英语、冗余表达、RTL 拼接、菜单 key 语义化）',
  inputSchema: {
    path: z.string().describe('项目或目录的绝对路径'),
    locale: z.string().optional().describe('目标语言代码（可选，未指定则检查所有语言）'),
    configPath: z.string().optional().describe('配置文件路径（可选）'),
  },
}

/**
 * MCP Tool Handler: i18n_check_quality
 */
export async function handler(input: QualityToolInput) {
  try {
    const { path: projectPath, locale, configPath } = input

    // 检查路径是否存在
    if (!existsSync(projectPath)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `## ❌ 错误\n\n路径不存在: ${projectPath}`,
          },
        ],
      }
    }

    // 加载配置
    const config = loadConfig(projectPath, configPath)

    // 确定要检查的语言列表
    const localesToCheck = locale ? [locale] : config.locales

    // 初始化检查器
    const chinglishChecker = new ChinglishChecker()
    const redundancyChecker = new RedundancyChecker()
    const rtlChecker = new RtlChecker()
    const menuKeyChecker = new MenuKeyChecker()

    // 收集所有质量问题
    const allIssues: QualityIssue[] = []

    // 遍历每个语言
    for (const localeCode of localesToCheck) {
      const langFilePath = path.join(projectPath, config.langDir, `${localeCode}.json`)

      // 检查语言包文件是否存在
      if (!existsSync(langFilePath)) {
        // 跳过缺失的语言包文件，不作为质量问题报告
        continue
      }

      // 读取语言包
      const content = readFileSync(langFilePath, 'utf-8')
      const translations = JSON.parse(content)

      // 递归遍历所有 key-value
      const checkTranslations = (obj: any, keyPrefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key

          // 只检查字符串值
          if (typeof value === 'string') {
            // 检查 key 语义化（只对顶层 key 检查）
            if (!keyPrefix) {
              const keyIssues = menuKeyChecker.check(fullKey)
              allIssues.push(...keyIssues)
            }

            // 检查中式英语（仅英语）
            if (localeCode.startsWith('en')) {
              const chinglishIssues = chinglishChecker.check(value)
              allIssues.push(
                ...chinglishIssues.map(issue => ({
                  ...issue,
                  context: `${localeCode}:${fullKey}`,
                }))
              )
            }

            // 检查冗余表达
            const redundancyIssues = redundancyChecker.check(value)
            allIssues.push(
              ...redundancyIssues.map(issue => ({
                ...issue,
                context: `${localeCode}:${fullKey}`,
              }))
            )

            // 检查 RTL 拼接问题（仅 RTL 语言）
            if (['ar', 'he', 'fa', 'ur'].includes(localeCode)) {
              const rtlIssues = rtlChecker.check(value, localeCode)
              allIssues.push(
                ...rtlIssues.map(issue => ({
                  ...issue,
                  context: `${localeCode}:${fullKey}`,
                }))
              )
            }
          } else if (typeof value === 'object' && value !== null) {
            // 递归检查嵌套对象
            checkTranslations(value, fullKey)
          }
        }
      }

      checkTranslations(translations)
    }

    // 格式化输出
    const markdown = formatQualityIssuesMd(allIssues)

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
