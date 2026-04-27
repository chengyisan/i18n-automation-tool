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

/** 质量问题 */
export interface QualityIssue {
  locale: string
  key: string
  text: string
  /** 问题类型 */
  type: 'chinglish' | 'redundant' | 'rtl-concatenation' | 'missing-interpolation'
  /** 严重级别 */
  severity: 'error' | 'warning' | 'info'
  /** 修复建议 */
  suggestion: string
}

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
  sharedI18nPackage?: string
  exclude: string[]
  keyPrefix: string
  translationService: 'google' | 'deepl' | 'claude' | 'local'

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
