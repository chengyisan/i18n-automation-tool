// @i18n-tool/core
// 核心层入口 — 框架无关的扫描、翻译、质量检查、验证能力

export { ChineseScanner } from './scanner/chineseScanner.js'
export { UntranslatableDetector } from './scanner/untranslatableDetector.js'
export { DuplicateDetector } from './scanner/duplicateDetector.js'

export { ApiTranslator } from './translator/apiTranslator.js'
export { CacheManager } from './translator/cacheManager.js'

export { ChinglishChecker } from './quality/chinglishChecker.js'
export { RedundancyChecker } from './quality/redundancyChecker.js'
export { RtlChecker } from './quality/rtlChecker.js'

export { ConfigValidator } from './validator/configValidator.js'
export { CoverageReporter } from './validator/coverageReporter.js'
export { LayoutChecker } from './validator/layoutChecker.js'

export type { ScanResult, TranslationEntry, QualityIssue, ValidationResult } from './types.js'
