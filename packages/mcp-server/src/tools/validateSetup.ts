import { ConfigValidator, checkKeyIntegrity } from '@i18n-tool/core'
import type { BaseToolInput } from '../types.js'
import type { ValidationError, ValidationWarning } from '@i18n-tool/core'
import { loadConfig } from '../shared/loadConfig.js'
import { formatValidationResultMd } from '../shared/formatters.js'
import { existsSync, statSync } from 'fs'
import { z } from 'zod'

/**
 * MCP Tool Schema: i18n_validate_setup
 */
export const schema = {
  name: 'i18n_validate_setup',
  description: '验证 i18n 配置完整性和语言包 key 完整性',
  inputSchema: {
    path: z.string().describe('项目根路径'),
    configPath: z.string().optional().describe('配置文件路径（可选）'),
  },
}

/**
 * MCP Tool Handler: i18n_validate_setup
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

    // 确保是目录
    const stat = statSync(path)
    if (!stat.isDirectory()) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `## ❌ 错误\n\n路径必须是目录: ${path}`,
          },
        ],
      }
    }

    // 加载配置
    const config = loadConfig(path, configPath)

    // 验证配置
    const validator = new ConfigValidator()
    const validationIssues = validator.validate(config, path)

    // 转换 ValidationIssue 为 ValidationError/ValidationWarning
    const configIssues: (ValidationError | ValidationWarning)[] = validationIssues.map((issue) => {
      const baseIssue = {
        filePath: issue.path || path,
        message: issue.message,
        rule: issue.type,
      }
      return issue.severity === 'error'
        ? (baseIssue as ValidationError)
        : (baseIssue as ValidationWarning)
    })

    // 检查 key 完整性
    const keyResult = checkKeyIntegrity(
      config.localeDir || config.langDir,
      config.locales,
      config.defaultLocale
    )

    // 格式化输出
    const markdown = formatValidationResultMd(configIssues, keyResult)

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

