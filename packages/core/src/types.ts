// @i18n-tool/core 类型定义

/** 扫描结果 */
export interface ScanResult {
  /** 文件路径 */
  filePath: string
  /** 发现的硬编码中文 */
  hardcodedStrings: HardcodedString[]
  /** 不可转换的中文 */
  untranslatables: UntranslatableItem[]
  /** 重复翻译 */
  duplicates: DuplicateKey[]
}

/** 硬编码中文 */
export interface HardcodedString {
  text: string
  line: number
  column: number
  /** 所在上下文：template / script / style */
  context: 'template' | 'script' | 'style'
  /** 建议的 i18n key */
  suggestedKey?: string
}

/** 不可转换的中文 */
export interface UntranslatableItem {
  text: string
  line: number
  column: number
  /** 不可转换的原因 */
  reason: 'backend-value' | 'image-text' | 'svg-text' | 'dynamic-string'
  /** 处理建议 */
  suggestion: string
}

/** 重复翻译 key */
export interface DuplicateKey {
  key: string
  value: string
  /** 出现的位置 */
  locations: { filePath: string; line: number }[]
  /** 出现次数 */
  count: number
}

/** 翻译条目 */
export interface TranslationEntry {
  key: string
  /** 各语种翻译 */
  translations: Record<string, string>
  /** 翻译状态 */
  status: 'draft' | 'review' | 'approved' | 'published'
  /** 来源 */
  source: 'manual' | 'api' | 'local-model' | 'cache'
}

/** 质量问题（Phase 1 遗留，Phase 2 使用新的 QualityIssue） */
// 旧接口已移至文件末尾的新 QualityIssue 定义

/** 验证结果 */
export interface ValidationResult {
  /** 是否通过 */
  passed: boolean
  /** 错误列表 */
  errors: ValidationError[]
  /** 警告列表 */
  warnings: ValidationWarning[]
  /** 覆盖率统计 */
  coverage: CoverageStats
}

/** 验证错误 */
export interface ValidationError {
  filePath: string
  line?: number
  message: string
  rule: string
}

/** 验证警告 */
export interface ValidationWarning {
  filePath: string
  line?: number
  message: string
  rule: string
}

/** 覆盖率统计 */
export interface CoverageStats {
  /** 总文案数 */
  total: number
  /** 已翻译数 */
  translated: number
  /** 覆盖率百分比 */
  percentage: number
  /** 各语种覆盖率 */
  byLocale: Record<string, { translated: number; total: number; percentage: number }>
}

/** 工具配置 */
export interface I18nToolConfig {
  locales: string[]
  defaultLocale: string
  langDir: string
  /** localeDir 是 langDir 的别名，兼容不同配置风格 */
  localeDir?: string
  sharedI18nPackage?: string
  exclude: string[]
  keyPrefix: string
  translationService: 'google' | 'deepl' | 'claude' | 'local'

  /** 翻译 API 配置（可选） */
  translation?: TranslationConfig
  /** 缓存配置（可选） */
  cache?: CacheConfig
  /** 扫描配置（可选） */
  scan?: {
    include?: string[]
    exclude?: string[]
  }

  qualityChecks: {
    chinglish: boolean
    redundantExpressions: boolean
    rtlConcatenation: boolean
  }

  reactiveChecks: {
    staticObjectWithT: boolean
    refAssignmentWithT: boolean
  }

  layoutChecks: {
    fixedWidth: boolean
    tableColumnWidth: boolean
  }

  untranslatablePatterns: {
    backendValues: string[]
    imageExtensions: string[]
    svgTextNodes: boolean
  }

  sharedTranslationDetection: {
    enabled: boolean
    minOccurrences: number
    suggestMerge: boolean
  }

  security: {
    translationMode: 'local' | 'api' | 'hybrid'
    sensitivePatterns: string[]
    requireApproval: boolean
  }

  performance: {
    parallelScan: { enabled: boolean; maxWorkers: number }
    translationCache: { enabled: boolean; path: string; ttl: string }
    batchTranslation: { enabled: boolean; batchSize: number }
  }
}

/** 配置验证结果 */
export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/** 扫描选项 */
export interface ScanOptions {
  /** 文件内容 */
  content: string
  /** 文件路径 */
  filePath: string
  /** 排除模式 */
  excludePatterns?: RegExp[]
  /** 是否包含注释中的中文 */
  includeComments?: boolean
}

/** 排除区域 */
export interface ExclusionRange {
  start: number
  end: number
  reason: string
}

/** 位置信息 */
export interface Position {
  line: number
  column: number
}

/** 翻译配置 */
export interface TranslationConfig {
  /** 翻译提供商 */
  provider: 'google' | 'deepl'
  /** API Key */
  apiKey: string
  /** 重试次数 */
  retries?: number
}

/** 翻译结果 */
export interface TranslationResult {
  /** 原文 */
  sourceText: string
  /** 译文 */
  translatedText: string
  /** 源语言 */
  sourceLang: string
  /** 目标语言 */
  targetLang: string
  /** 是否来自缓存 */
  fromCache: boolean
}

/** 缓存配置 */
export interface CacheConfig {
  /** 缓存文件路径 */
  path: string
  /** 过期时间（毫秒），0 表示永不过期 */
  ttl: number
}

/** 质量问题（更新） */
export interface QualityIssue {
  /** 问题类型 */
  type: 'chinglish' | 'redundancy' | 'rtl'
  /** 严重级别 */
  severity: 'error' | 'warning' | 'info'
  /** 问题描述 */
  message: string
  /** 修复建议 */
  suggestion: string
  /** 位置信息 */
  position?: {
    start: number
    end: number
  }
  /** 上下文 */
  context?: string
}

/** 验证问题 */
export interface ValidationIssue {
  /** 问题类型 */
  type: 'missing_locale_file' | 'invalid_config' | 'invalid_locale' | 'missing_translation_key' | 'extra_translation_key'
  /** 严重级别 */
  severity: 'error' | 'warning' | 'info'
  /** 问题描述 */
  message: string
  /** 修复建议 */
  suggestion: string
  /** 文件路径（可选） */
  path?: string
  /** 语言代码（可选） */
  locale?: string
  /** 翻译 key（可选） */
  key?: string
}

/** Key 完整性检查结果 */
export interface KeyIntegrityResult {
  /** 基准语言 */
  baseLocale: string
  /** 所有语言 */
  locales: string[]
  /** 基准语言总 key 数 */
  totalKeys: number
  /** 问题列表 */
  issues: ValidationIssue[]
  /** 各语言统计 */
  localeStats: Record<string, { missing: number; extra: number; total: number }>
}

/** 覆盖率报告 */
export interface CoverageReport {
  /** 总文件数 */
  totalFiles: number
  /** 包含中文的文件数 */
  filesWithChinese: number
  /** 总中文字符串数 */
  totalChineseStrings: number
  /** 已转换的字符串数 */
  convertedStrings: number
  /** 覆盖率百分比 */
  coverage: number
  /** 文件详情 */
  files: Array<{
    path: string
    totalStrings: number
    convertedStrings: number
    coverage: number
  }>
}

/** 布局问题 */
export interface LayoutIssue {
  /** 问题类型 */
  type: 'fixed_width' | 'fixed_height'
  /** 严重级别 */
  severity: 'error' | 'warning' | 'info'
  /** 问题描述 */
  message: string
  /** 修复建议 */
  suggestion: string
  /** 文件路径 */
  file: string
  /** CSS 属性 */
  property: string
  /** CSS 值 */
  value: string
}


