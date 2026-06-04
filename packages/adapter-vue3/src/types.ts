// @i18n-tool/adapter-vue3 类型定义

/** Vue SFC 解析结果 */
export interface ParsedVueSfc {
  /** template 块 */
  template: {
    content: string
    ast: any
    startLine: number
  } | null
  /** script 块（普通） */
  script: {
    content: string
    ast: any
    startLine: number
    lang: 'js' | 'ts'
  } | null
  /** script setup 块 */
  scriptSetup: {
    content: string
    ast: any
    startLine: number
    lang: 'js' | 'ts'
  } | null
  /** style 块列表 */
  styles: Array<{
    content: string
    startLine: number
    scoped: boolean
  }>
  /** 文件路径 */
  filePath: string
}

/** 代码替换结果 */
export interface ReplacementResult {
  /** 文件路径 */
  filePath: string
  /** 原始内容 */
  originalContent: string
  /** 修改后内容 */
  modifiedContent: string
  /** 替换详情 */
  replacements: Array<{
    /** 原始文本 */
    original: string
    /** 替换后文本 */
    replacement: string
    /** i18n key */
    key: string
    /** 行号 */
    line: number
    /** 上下文 */
    context: 'template' | 'script'
  }>
  /** 新增的导入语句 */
  addedImports: string[]
}

/** 响应式问题 */
export interface ReactiveIssue {
  /** 问题类型 */
  type: 'ref-with-t' | 'static-object-with-t' | 'top-level-t-assignment' | 'jsx-return-with-t' | 'factory-function-sync' | 'api-locale-watch'
  /** 文件路径 */
  filePath: string
  /** 行号 */
  line: number
  /** 列号 */
  column: number
  /** 问题代码 */
  code: string
  /** 修复建议 */
  suggestion: string
}

/** Element Plus 问题 */
export interface ElementPlusIssue {
  /** 问题类型 */
  type: 'missing-config-provider' | 'missing-locale-import' | 'hardcoded-prop'
  /** 文件路径 */
  filePath: string
  /** 行号 */
  line: number
  /** 问题描述 */
  message: string
  /** 修复建议 */
  suggestion: string
}

/** 模板拼接空格问题 */
export interface TemplateConcatIssue {
  /** 问题类型 */
  type: 'template-concat-missing-space'
  /** 文件路径 */
  filePath: string
  /** 行号 */
  line: number
  /** 问题代码 */
  code: string
  /** 修复建议 */
  suggestion: string
}
