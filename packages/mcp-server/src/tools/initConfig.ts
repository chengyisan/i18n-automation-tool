import { DEFAULT_CONFIG } from '@i18n-tool/core'
import type { InitConfigInput } from '../types.js'
import { existsSync } from 'fs'
import { z } from 'zod'

/**
 * MCP Tool Schema: i18n_init_config
 */
export const schema = {
  name: 'i18n_init_config',
  description: '生成 .i18nrc.json 配置文件内容（返回 JSON，不写盘）',
  inputSchema: {
    path: z.string().describe('项目路径'),
    locales: z.array(z.string()).optional().describe('支持的语言列表（如 ["zh-CN", "en-US"]）'),
    defaultLocale: z.string().optional().describe('默认语言'),
    langDir: z.string().optional().describe('语言包目录'),
    enableQualityChecks: z.boolean().optional().describe('是否启用翻译质量检查'),
    enableReactiveChecks: z.boolean().optional().describe('是否启用响应式检查'),
  },
}

/**
 * MCP Tool Handler: i18n_init_config
 */
export async function handler(input: InitConfigInput) {
  try {
    const {
      path,
      locales,
      defaultLocale,
      langDir,
      enableQualityChecks,
      enableReactiveChecks,
    } = input

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

    // 组装配置对象（使用用户输入或默认值）
    const config = {
      locales: locales || DEFAULT_CONFIG.locales,
      defaultLocale: defaultLocale || DEFAULT_CONFIG.defaultLocale,
      langDir: langDir || DEFAULT_CONFIG.langDir,
      sharedI18nPackage: DEFAULT_CONFIG.sharedI18nPackage,
      exclude: DEFAULT_CONFIG.exclude,
      keyPrefix: DEFAULT_CONFIG.keyPrefix,
      translationService: DEFAULT_CONFIG.translationService,

      qualityChecks:
        enableQualityChecks !== undefined
          ? {
              chinglish: enableQualityChecks,
              redundantExpressions: enableQualityChecks,
              rtlConcatenation: enableQualityChecks,
            }
          : DEFAULT_CONFIG.qualityChecks,

      reactiveChecks:
        enableReactiveChecks !== undefined
          ? {
              staticObjectWithT: enableReactiveChecks,
              refAssignmentWithT: enableReactiveChecks,
            }
          : DEFAULT_CONFIG.reactiveChecks,

      layoutChecks: DEFAULT_CONFIG.layoutChecks,
      untranslatablePatterns: DEFAULT_CONFIG.untranslatablePatterns,
      sharedTranslationDetection: DEFAULT_CONFIG.sharedTranslationDetection,
      security: DEFAULT_CONFIG.security,
    }

    // 格式化为 JSON
    const json = JSON.stringify(config, null, 2)

    // 返回 markdown code block
    const markdown = `# 配置文件内容\n\n请将以下内容保存为 \`.i18nrc.json\`：\n\n\`\`\`json\n${json}\n\`\`\``

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
