// @i18n-tool/adapter-vue3
// Vue 3 适配器入口

export { VueSfcParser } from './parser/vueSfcParser.js'
export { CodeReplacer } from './replacer/codeReplacer.js'
export { ReactiveChecker } from './checker/reactiveChecker.js'
export { ApiLocaleChecker } from './checker/apiLocaleChecker.js'
export { TemplateConcatChecker } from './checker/templateConcatChecker.js'
export { FragmentedTranslationChecker } from './checker/fragmentedTranslationChecker.js'
export { SseWsLocaleChecker } from './checker/sseWsLocaleChecker.js'
export { CachedRefLocaleChecker } from './checker/cachedRefLocaleChecker.js'
export { ElementPlusAdapter } from './ui-lib/elementPlusAdapter.js'

export type { ParsedVueSfc, ReplacementResult, ReactiveIssue, TemplateConcatIssue, ElementPlusIssue } from './types.js'
