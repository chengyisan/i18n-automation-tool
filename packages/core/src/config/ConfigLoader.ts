import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { I18nToolConfig, ConfigValidationResult } from '../types.js'

/** 默认配置 */
export const DEFAULT_CONFIG: I18nToolConfig = {
  locales: ['zh-CN', 'en-US'],
  defaultLocale: 'zh-CN',
  langDir: 'locales',
  sharedI18nPackage: undefined,
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/coverage/**',
  ],
  keyPrefix: '',
  translationService: 'local',

  qualityChecks: {
    chinglish: true,
    redundantExpressions: true,
    rtlConcatenation: true,
  },

  reactiveChecks: {
    staticObjectWithT: true,
    refAssignmentWithT: true,
  },

  layoutChecks: {
    fixedWidth: true,
    tableColumnWidth: true,
  },

  untranslatablePatterns: {
    backendValues: ['value', 'code', 'status', 'type'],
    imageExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'],
    svgTextNodes: true,
  },

  sharedTranslationDetection: {
    enabled: true,
    minOccurrences: 3,
    suggestMerge: true,
  },

  security: {
    translationMode: 'local',
    sensitivePatterns: [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
    ],
    requireApproval: true,
  },

  performance: {
    parallelScan: { enabled: true, maxWorkers: 4 },
    translationCache: {
      enabled: true,
      path: '.i18n-cache',
      ttl: '7d'
    },
    batchTranslation: { enabled: true, batchSize: 50 },
  },
}

/** 配置加载器 */
export class ConfigLoader {
  private static cachedConfig: I18nToolConfig | null = null

  /**
   * 加载配置文件
   * @param configPath 配置文件路径（默认为 ./.i18nrc.json）
   * @returns 完整的配置对象
   */
  static loadConfig(configPath?: string): I18nToolConfig {
    // 如果已有缓存，直接返回
    if (this.cachedConfig) {
      return this.cachedConfig
    }

    const finalPath = configPath || resolve(process.cwd(), '.i18nrc.json')

    // 如果文件不存在，使用默认配置
    if (!existsSync(finalPath)) {
      console.warn(`配置文件不存在: ${finalPath}，使用默认配置`)
      this.cachedConfig = DEFAULT_CONFIG
      return DEFAULT_CONFIG
    }

    try {
      // 读取并解析 JSON 文件
      const fileContent = readFileSync(finalPath, 'utf-8')
      const userConfig = JSON.parse(fileContent) as Partial<I18nToolConfig>

      // 合并配置
      const mergedConfig = this.mergeConfig(userConfig, DEFAULT_CONFIG)

      // 验证配置
      const validation = this.validateConfig(mergedConfig)
      if (!validation.valid) {
        throw new Error(`配置验证失败:\n${validation.errors.join('\n')}`)
      }

      // 输出警告
      if (validation.warnings.length > 0) {
        console.warn('配置警告:')
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`))
      }

      // 缓存配置
      this.cachedConfig = mergedConfig
      return mergedConfig
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`配置文件 JSON 格式错误: ${finalPath}\n${error.message}`)
      }
      throw error
    }
  }

  /**
   * 验证配置对象
   * @param config 配置对象
   * @returns 验证结果
   */
  static validateConfig(config: Partial<I18nToolConfig>): ConfigValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 必填字段验证
    if (!config.locales || config.locales.length === 0) {
      errors.push('locales 不能为空，至少需要一个语言代码')
    }

    if (!config.defaultLocale) {
      errors.push('defaultLocale 不能为空')
    }

    if (!config.langDir) {
      errors.push('langDir 不能为空')
    }

    // 逻辑验证
    if (config.locales && config.defaultLocale) {
      if (!config.locales.includes(config.defaultLocale)) {
        errors.push(`defaultLocale "${config.defaultLocale}" 必须存在于 locales 中`)
      }
    }

    // 格式验证
    if (config.translationService) {
      const validServices = ['google', 'deepl', 'claude', 'local']
      if (!validServices.includes(config.translationService)) {
        errors.push(`translationService 必须是 ${validServices.join(', ')} 之一`)
      }
    }

    // 性能配置验证
    if (config.performance?.parallelScan?.maxWorkers !== undefined) {
      if (config.performance.parallelScan.maxWorkers <= 0) {
        errors.push('performance.parallelScan.maxWorkers 必须大于 0')
      }
    }

    if (config.sharedTranslationDetection?.minOccurrences !== undefined) {
      if (config.sharedTranslationDetection.minOccurrences < 2) {
        errors.push('sharedTranslationDetection.minOccurrences 必须大于等于 2')
      }
    }

    // 警告
    if (config.exclude && config.exclude.length === 0) {
      warnings.push('exclude 为空，可能会扫描到不必要的文件（如 node_modules）')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 深度合并配置
   * @param userConfig 用户配置
   * @param defaultConfig 默认配置
   * @returns 合并后的配置
   */
  static mergeConfig(
    userConfig: Partial<I18nToolConfig>,
    defaultConfig: I18nToolConfig
  ): I18nToolConfig {
    const merged = { ...defaultConfig }

    for (const key in userConfig) {
      const userValue = userConfig[key as keyof I18nToolConfig]
      const defaultValue = defaultConfig[key as keyof I18nToolConfig]

      if (userValue === undefined) {
        continue
      }

      // 数组类型：用户配置完全覆盖
      if (Array.isArray(userValue)) {
        ;(merged as any)[key] = userValue
      }
      // 对象类型：递归合并
      else if (typeof userValue === 'object' && userValue !== null) {
        ;(merged as any)[key] = {
          ...(defaultValue as object),
          ...(userValue as object),
        }
      }
      // 基本类型：用户配置优先
      else {
        ;(merged as any)[key] = userValue
      }
    }

    return merged
  }

  /**
   * 清除缓存的配置
   */
  static clearCache(): void {
    this.cachedConfig = null
  }
}
