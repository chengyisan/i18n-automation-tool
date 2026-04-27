import type { UntranslatableItem, I18nToolConfig } from '../types.js'

/** 中文字符正则 */
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/

/**
 * 不可转换中文检测器
 * 负责识别代码中不应该被翻译的中文内容
 */
export class UntranslatableDetector {
  private config: I18nToolConfig

  constructor(config: I18nToolConfig) {
    this.config = config
  }

  /**
   * 检测文件中的不可转换中文
   * @param content 文件内容
   * @param filePath 文件路径
   * @returns 不可转换项数组
   */
  detect(content: string, filePath: string): UntranslatableItem[] {
    const items: UntranslatableItem[] = []

    // 检测后端 value 值
    items.push(...this.detectBackendValues(content))

    // 检测图片路径
    items.push(...this.detectImagePaths(content))

    // 检测 SVG 文本
    if (this.config.untranslatablePatterns.svgTextNodes) {
      items.push(...this.detectSvgText(content))
    }

    // 检测动态字符串
    items.push(...this.detectDynamicStrings(content))

    return items
  }

  /**
   * 检测后端交互的中文值
   * @param content 文件内容
   * @returns 不可转换项数组
   */
  private detectBackendValues(content: string): UntranslatableItem[] {
    const items: UntranslatableItem[] = []
    const backendFields = this.config.untranslatablePatterns.backendValues

    for (const field of backendFields) {
      // 匹配对象属性：{ value: '中文' }
      const pattern = new RegExp(
        `\\{[^}]*${field}\\s*:\\s*['"\`]([\\u4e00-\\u9fa5]+)['"\`]`,
        'g'
      )

      let match: RegExpExecArray | null
      while ((match = pattern.exec(content)) !== null) {
        const position = this.calculatePosition(content, match.index)
        items.push({
          text: match[1],
          line: position.line,
          column: position.column,
          reason: 'backend-value',
          suggestion: this.getBackendValueSuggestion(),
        })
      }
    }

    return items
  }

  /**
   * 检测图片路径中的中文
   * @param content 文件内容
   * @returns 不可转换项数组
   */
  private detectImagePaths(content: string): UntranslatableItem[] {
    const items: UntranslatableItem[] = []
    const extensions = this.config.untranslatablePatterns.imageExtensions.join('|')

    // 匹配图片路径的多种模式
    const patterns = [
      // src="./images/中文.png"
      new RegExp(`(?:src|href)\\s*=\\s*['"\`]([^'"\`]*[\\u4e00-\\u9fa5]+[^'"\`]*\\.(?:${extensions.replace(/\./g, '')}))['"\`]`, 'gi'),
      // import logo from './中文.png'
      new RegExp(`import\\s+\\w+\\s+from\\s+['"\`]([^'"\`]*[\\u4e00-\\u9fa5]+[^'"\`]*\\.(?:${extensions.replace(/\./g, '')}))['"\`]`, 'gi'),
      // require('./中文.png')
      new RegExp(`require\\s*\\(\\s*['"\`]([^'"\`]*[\\u4e00-\\u9fa5]+[^'"\`]*\\.(?:${extensions.replace(/\./g, '')}))['"\`]\\s*\\)`, 'gi'),
    ]

    for (const pattern of patterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(content)) !== null) {
        const position = this.calculatePosition(content, match.index)
        items.push({
          text: match[1],
          line: position.line,
          column: position.column,
          reason: 'image-text',
          suggestion: this.getImagePathSuggestion(),
        })
      }
    }

    return items
  }

  /**
   * 检测 SVG 文本节点中的中文
   * @param content 文件内容
   * @returns 不可转换项数组
   */
  private detectSvgText(content: string): UntranslatableItem[] {
    const items: UntranslatableItem[] = []

    // SVG text 和 tspan 节点 - 使用更宽松的匹配
    const textPattern = /<text[^>]*>([^<]+)<\/text>/g
    const tspanPattern = /<tspan[^>]*>([^<]+)<\/tspan>/g

    let match: RegExpExecArray | null

    // 匹配 text 节点
    while ((match = textPattern.exec(content)) !== null) {
      const text = match[1].trim()
      if (text && CHINESE_CHAR_REGEX.test(text)) {
        const position = this.calculatePosition(content, match.index)
        items.push({
          text,
          line: position.line,
          column: position.column,
          reason: 'svg-text',
          suggestion: this.getSvgTextSuggestion(),
        })
      }
    }

    // 匹配 tspan 节点
    while ((match = tspanPattern.exec(content)) !== null) {
      const text = match[1].trim()
      if (text && CHINESE_CHAR_REGEX.test(text)) {
        const position = this.calculatePosition(content, match.index)
        items.push({
          text,
          line: position.line,
          column: position.column,
          reason: 'svg-text',
          suggestion: this.getSvgTextSuggestion(),
        })
      }
    }

    return items
  }

  /**
   * 检测动态拼接的字符串
   * @param content 文件内容
   * @returns 不可转换项数组
   */
  private detectDynamicStrings(content: string): UntranslatableItem[] {
    const items: UntranslatableItem[] = []

    // 模板字符串中的中文：`用户${name}已登录`
    const templatePattern = /`[^\`]*[\u4e00-\u9fa5]+[^\`]*\$\{[^}]+\}[^\`]*[\u4e00-\u9fa5]*[^\`]*`/g
    let match: RegExpExecArray | null

    while ((match = templatePattern.exec(content)) !== null) {
      const position = this.calculatePosition(content, match.index)
      items.push({
        text: match[0],
        line: position.line,
        column: position.column,
        reason: 'dynamic-string',
        suggestion: this.getDynamicStringSuggestion(),
      })
    }

    // 字符串拼接：'欢迎' + name + '登录'
    const concatPattern = /['"`][\u4e00-\u9fa5]+['"`]\s*\+\s*\w+\s*\+\s*['"`][\u4e00-\u9fa5]+['"`]/g
    while ((match = concatPattern.exec(content)) !== null) {
      const position = this.calculatePosition(content, match.index)
      items.push({
        text: match[0],
        line: position.line,
        column: position.column,
        reason: 'dynamic-string',
        suggestion: this.getDynamicStringSuggestion(),
      })
    }

    return items
  }

  /**
   * 计算字符在文本中的行号和列号
   * @param content 文本内容
   * @param index 字符索引
   * @returns 位置信息
   */
  private calculatePosition(content: string, index: number): { line: number; column: number } {
    const lines = content.substring(0, index).split('\n')
    return {
      line: lines.length,
      column: lines[lines.length - 1].length,
    }
  }

  /**
   * 获取后端 value 的处理建议
   */
  private getBackendValueSuggestion(): string {
    return `不可翻译：这是与后端交互的枚举值/状态码。

建议处理方式：
1. 保持 value 为中文（与后端约定）
2. 添加对应的 label 字段用于显示翻译：
   { value: '已完成', label: t('status.completed') }
3. 或者与后端协商改为英文枚举值：
   { value: 'completed', label: t('status.completed') }`
  }

  /**
   * 获取图片路径的处理建议
   */
  private getImagePathSuggestion(): string {
    return `不可翻译：图片路径包含中文。

建议处理方式：
1. 为每种语言准备对应的图片资源：
   - images/logo-zh.png
   - images/logo-en.png
   - images/logo-ar.png
2. 使用动态路径：
   <img :src="\`./images/logo-\${locale}.png\`" />
3. 或者将图片中的文字提取为 i18n 文本，使用纯图标`
  }

  /**
   * 获取 SVG 文本的处理建议
   */
  private getSvgTextSuggestion(): string {
    return `不可翻译：SVG 文本节点包含中文。

建议处理方式：
1. 将 SVG 文本提取为 i18n：
   <text>{{ t('svg.label') }}</text>
2. 为每种语言准备独立的 SVG 文件：
   - icon-zh.svg
   - icon-en.svg
3. 使用 Vue 组件动态渲染 SVG 文本：
   <svg>
     <text>{{ t('label') }}</text>
   </svg>`
  }

  /**
   * 获取动态字符串的处理建议
   */
  private getDynamicStringSuggestion(): string {
    return `需要特殊处理：动态拼接的字符串。

建议处理方式：
1. 使用 i18n 插值语法：
   t('welcome', { name })  // 翻译文件：'欢迎 {name} 登录'
2. 拆分为多个 i18n key：
   \`\${t('welcome')} \${name} \${t('login')}\`
3. 如果逻辑复杂，使用函数封装：
   function getWelcomeMsg(name) {
     return t('welcome', { name })
   }`
  }
}
