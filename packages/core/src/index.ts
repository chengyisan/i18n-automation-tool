// @i18n-tool/core
// 核心层入口 — 框架无关的扫描、翻译、质量检查、验证能力

// 配置
export { ConfigLoader, DEFAULT_CONFIG } from './config/ConfigLoader.js'

// 扫描器
export { ChineseScanner } from './scanner/ChineseScanner.js'
export { UntranslatableDetector } from './scanner/UntranslatableDetector.js'

// 翻译
export { ApiTranslator } from './translator/ApiTranslator.js'
export { CacheManager } from './cache/CacheManager.js'

// 质量检查
export { ChinglishChecker } from './quality/ChinglishChecker.js'
export { RedundancyChecker } from './quality/RedundancyChecker.js'
export { RtlChecker } from './quality/RtlChecker.js'

// 验证
export { ConfigValidator } from './validator/ConfigValidator.js'
export { CoverageReporter } from './validator/CoverageReporter.js'
export { LayoutChecker } from './validator/LayoutChecker.js'

// 类型导出
export type {
  ScanResult,
  HardcodedString,
  UntranslatableItem,
  DuplicateKey,
  TranslationEntry,
  QualityIssue,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CoverageStats,
  I18nToolConfig,
  ConfigValidationResult,
  ScanOptions,
  ExclusionRange,
  Position,
  TranslationConfig,
  TranslationResult,
  CacheConfig,
  ValidationIssue,
  CoverageReport,
  LayoutIssue,
} from './types.js'

