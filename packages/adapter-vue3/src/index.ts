// @i18n-tool/adapter-vue3
// Vue 3 适配器入口

export { VueSfcParser } from './parser/vueSfcParser.js'
export { CodeReplacer } from './replacer/codeReplacer.js'
export { ReactiveChecker } from './checker/reactiveChecker.js'
export { ElementPlusAdapter } from './ui-lib/elementPlusAdapter.js'

export type { ParsedVueSfc, ReplacementResult, ReactiveIssue } from './types.js'
