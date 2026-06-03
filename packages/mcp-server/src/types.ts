// MCP Server 内部类型定义

/** 所有 tool 的公共参数 */
export interface BaseToolInput {
  /** 项目或文件的绝对路径 */
  path: string
  /** 可选的配置文件路径 */
  configPath?: string
}

/** 扫描工具输入参数 */
export interface ScanToolInput extends BaseToolInput {
  /** 是否包含注释中的中文 */
  includeComments?: boolean
}

/** 翻译质量检查工具输入参数 */
export interface QualityToolInput extends BaseToolInput {
  /** 目标语言代码 */
  locale?: string
}

/** 响应式检查工具输入参数 */
export interface ReactiveCheckToolInput extends BaseToolInput {
  /** 是否包含建议修复方案 */
  includeFix?: boolean
}

/** 验证工具输入参数 */
export interface ValidateToolInput extends BaseToolInput {
  /** 验证类型：completeness | installation | coverage */
  type?: 'completeness' | 'installation' | 'coverage'
}

/** 初始化配置工具输入参数 */
export interface InitConfigInput {
  /** 项目路径 */
  path: string
  /** 支持的语言列表 */
  locales?: string[]
  /** 默认语言 */
  defaultLocale?: string
  /** 语言包目录 */
  langDir?: string
  /** 是否启用翻译质量检查 */
  enableQualityChecks?: boolean
  /** 是否启用响应式检查 */
  enableReactiveChecks?: boolean
}

/** MCP Tool 返回内容项 */
export interface ToolOutputContent {
  type: 'text'
  text: string
}

/** MCP Tool 统一返回类型 */
export interface ToolOutput {
  content: ToolOutputContent[]
}
