import type {
  ScanOptions,
  ScanResult,
  HardcodedString,
  ExclusionRange,
  Position,
  I18nToolConfig,
} from '../types.js'

/** 中文字符正则 */
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/
/** 中文文本片段正则（含中文标点、数字、空格） */
const CHINESE_TEXT_REGEX = /[\u4e00-\u9fa5][\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\d\s]*/g

/** 字符串字面量正则 */
const SINGLE_QUOTE_STRING = /'([^'\\]|\\.)*'/g
const DOUBLE_QUOTE_STRING = /"([^"\\]|\\.)*"/g
const TEMPLATE_STRING = /`([^`\\]|\\.)*`/g

/** 排除模式 */
const SINGLE_LINE_COMMENT = /\/\/.*$/gm
const MULTI_LINE_COMMENT = /\/\*[\s\S]*?\*\//g
const HTML_COMMENT = /<!--[\s\S]*?-->/g
const URL_PATTERN = /https?:\/\/[^\s'"]+/g
const I18N_CALL = /\$?t\s*\(\s*['"`][^'"`]*['"`]\s*\)/g
const TEMPLATE_I18N = /\{\{\s*\$?t\s*\(\s*['"`][^'"`]*['"`]\s*\)\s*\}\}/g
const ATTR_I18N = /:\w+\s*=\s*["`]\s*\$?t\s*\(\s*['"`][^'"`]*['"`]\s*\)\s*["`]/g
const IMPORT_STATEMENT = /import\s+.*?from\s+['"`].*?['"`]/g
const REQUIRE_STATEMENT = /require\s*\(\s*['"`].*?['"`]\s*\)/g
const CONSOLE_STATEMENT = /console\.\w+\s*\([^)]*\)/g

/**
 * 中文扫描器
 * 负责扫描源代码中的硬编码中文字符串
 */
export class ChineseScanner {
  private config: I18nToolConfig

  constructor(config: I18nToolConfig) {
    this.config = config
  }

  /**
   * 扫描文件内容
   * @param options 扫描选项
   * @returns 扫描结果
   */
  scanContent(options: ScanOptions): ScanResult {
    const { content, filePath, excludePatterns = [], includeComments = false } = options

    // 构建排除区域映射
    const exclusions = this.buildExclusionMap(content, includeComments)

    // 提取所有字符串字面量和 HTML 文本
    const strings = this.extractStrings(content)
    const htmlTexts = this.extractHtmlTexts(content)
    const allTexts = [...strings, ...htmlTexts]

    // 过滤并识别硬编码中文
    const hardcodedStrings: HardcodedString[] = []

    for (const str of allTexts) {
      // 检查是否包含中文
      if (!CHINESE_CHAR_REGEX.test(str.text)) {
        continue
      }

      // 检查是否在排除区域内
      if (this.isInExclusionRange(str.start, exclusions)) {
        continue
      }

      // 应用额外的排除模式
      if (excludePatterns.some(pattern => pattern.test(str.text))) {
        continue
      }

      // 计算位置信息
      const position = this.calculatePosition(content, str.start)

      // 提取中文文本
      const chineseMatches = str.text.match(CHINESE_TEXT_REGEX) || []

      for (const chineseText of chineseMatches) {
        hardcodedStrings.push({
          text: chineseText,
          line: position.line,
          column: position.column,
          context: this.detectContext(content, str.start),
          suggestedKey: this.suggestKey(chineseText),
        })
      }
    }

    return {
      filePath,
      hardcodedStrings,
      untranslatables: [],
      duplicates: [],
    }
  }

  /**
   * 构建排除区域映射
   * @param content 文件内容
   * @param includeComments 是否包含注释
   * @returns 排除区域数组
   */
  private buildExclusionMap(content: string, includeComments: boolean): ExclusionRange[] {
    const exclusions: ExclusionRange[] = []

    // 排除注释
    if (!includeComments) {
      // 单行注释
      let match: RegExpExecArray | null
      const singleLineRegex = new RegExp(SINGLE_LINE_COMMENT)
      while ((match = singleLineRegex.exec(content)) !== null) {
        exclusions.push({
          start: match.index,
          end: match.index + match[0].length,
          reason: 'single-line-comment',
        })
      }

      // 多行注释
      const multiLineRegex = new RegExp(MULTI_LINE_COMMENT)
      while ((match = multiLineRegex.exec(content)) !== null) {
        exclusions.push({
          start: match.index,
          end: match.index + match[0].length,
          reason: 'multi-line-comment',
        })
      }

      // HTML 注释
      const htmlCommentRegex = new RegExp(HTML_COMMENT)
      while ((match = htmlCommentRegex.exec(content)) !== null) {
        exclusions.push({
          start: match.index,
          end: match.index + match[0].length,
          reason: 'html-comment',
        })
      }
    }

    // 排除 URL
    const urlRegex = new RegExp(URL_PATTERN)
    let match: RegExpExecArray | null
    while ((match = urlRegex.exec(content)) !== null) {
      exclusions.push({
        start: match.index,
        end: match.index + match[0].length,
        reason: 'url',
      })
    }

    // 排除已有 i18n 调用
    const i18nRegex = new RegExp(I18N_CALL)
    while ((match = i18nRegex.exec(content)) !== null) {
      exclusions.push({
        start: match.index,
        end: match.index + match[0].length,
        reason: 'i18n-call',
      })
    }

    const templateI18nRegex = new RegExp(TEMPLATE_I18N)
    while ((match = templateI18nRegex.exec(content)) !== null) {
      exclusions.push({
        start: match.index,
        end: match.index + match[0].length,
        reason: 'template-i18n',
      })
    }

    const attrI18nRegex = new RegExp(ATTR_I18N)
    while ((match = attrI18nRegex.exec(content)) !== null) {
      exclusions.push({
        start: match.index,
        end: match.index + match[0].length,
        reason: 'attr-i18n',
      })
    }

    // 排除 import/require
    const importRegex = new RegExp(IMPORT_STATEMENT)
    while ((match = importRegex.exec(content)) !== null) {
      exclusions.push({
        start: match.index,
        end: match.index + match[0].length,
        reason: 'import',
      })
    }

    const requireRegex = new RegExp(REQUIRE_STATEMENT)
    while ((match = requireRegex.exec(content)) !== null) {
      exclusions.push({
        start: match.index,
        end: match.index + match[0].length,
        reason: 'require',
      })
    }

    // 排除 console
    const consoleRegex = new RegExp(CONSOLE_STATEMENT)
    while ((match = consoleRegex.exec(content)) !== null) {
      exclusions.push({
        start: match.index,
        end: match.index + match[0].length,
        reason: 'console',
      })
    }

    return exclusions
  }

  /**
   * 提取所有字符串字面量
   * @param content 文件内容
   * @returns 字符串数组
   */
  private extractStrings(content: string): Array<{ text: string; start: number }> {
    const strings: Array<{ text: string; start: number }> = []

    // 单引号字符串
    let match: RegExpExecArray | null
    const singleQuoteRegex = new RegExp(SINGLE_QUOTE_STRING)
    while ((match = singleQuoteRegex.exec(content)) !== null) {
      const text = match[0].slice(1, -1) // 去掉引号
      // 排除 URL
      if (!this.isUrl(text)) {
        strings.push({
          text,
          start: match.index,
        })
      }
    }

    // 双引号字符串
    const doubleQuoteRegex = new RegExp(DOUBLE_QUOTE_STRING)
    while ((match = doubleQuoteRegex.exec(content)) !== null) {
      const text = match[0].slice(1, -1)
      if (!this.isUrl(text)) {
        strings.push({
          text,
          start: match.index,
        })
      }
    }

    // 模板字符串
    const templateRegex = new RegExp(TEMPLATE_STRING)
    while ((match = templateRegex.exec(content)) !== null) {
      const text = match[0].slice(1, -1)
      if (!this.isUrl(text)) {
        strings.push({
          text,
          start: match.index,
        })
      }
    }

    return strings
  }

  /**
   * 判断字符串是否为 URL
   * @param text 文本
   * @returns 是否为 URL
   */
  private isUrl(text: string): boolean {
    return /^https?:\/\//.test(text)
  }

  /**
   * 提取 HTML 标签中的文本内容
   * @param content 文件内容
   * @returns 文本数组
   */
  private extractHtmlTexts(content: string): Array<{ text: string; start: number }> {
    const texts: Array<{ text: string; start: number }> = []

    // 匹配 HTML 标签之间的文本：>文本<
    // 排除 script、style、template 等特殊标签
    const htmlTextRegex = />([^<>]+)</g
    let match: RegExpExecArray | null

    while ((match = htmlTextRegex.exec(content)) !== null) {
      const text = match[1].trim()
      if (!text || !CHINESE_CHAR_REGEX.test(text)) {
        continue
      }

      // 检查是否在 script/style 标签内（这些内容应该通过字符串提取）
      const beforeText = content.substring(0, match.index)
      const scriptStart = beforeText.lastIndexOf('<script')
      const scriptEnd = beforeText.lastIndexOf('</script>')
      const styleStart = beforeText.lastIndexOf('<style')
      const styleEnd = beforeText.lastIndexOf('</style>')

      // 如果在 script 或 style 标签内，跳过
      if (scriptStart > scriptEnd || styleStart > styleEnd) {
        continue
      }

      texts.push({
        text,
        start: match.index + 1, // +1 跳过 >
      })
    }

    return texts
  }

  /**
   * 检查位置是否在排除区域内
   * @param position 位置
   * @param exclusions 排除区域数组
   * @returns 是否在排除区域内
   */
  private isInExclusionRange(position: number, exclusions: ExclusionRange[]): boolean {
    return exclusions.some(
      exclusion => position >= exclusion.start && position < exclusion.end
    )
  }

  /**
   * 计算字符在文本中的行号和列号
   * @param content 文本内容
   * @param index 字符索引
   * @returns 位置信息
   */
  private calculatePosition(content: string, index: number): Position {
    const lines = content.substring(0, index).split('\n')
    return {
      line: lines.length,
      column: lines[lines.length - 1].length,
    }
  }

  /**
   * 检测上下文（template / script / style）
   * @param content 文件内容
   * @param position 位置
   * @returns 上下文类型
   */
  private detectContext(
    content: string,
    position: number
  ): 'template' | 'script' | 'style' {
    // 简单判断：查找最近的 <template>、<script>、<style> 标签
    const beforeContent = content.substring(0, position)

    const templateStart = beforeContent.lastIndexOf('<template')
    const templateEnd = beforeContent.lastIndexOf('</template>')
    const scriptStart = beforeContent.lastIndexOf('<script')
    const scriptEnd = beforeContent.lastIndexOf('</script>')
    const styleStart = beforeContent.lastIndexOf('<style')
    const styleEnd = beforeContent.lastIndexOf('</style>')

    // 判断是否在某个标签内（开始标签在结束标签之后）
    const inTemplate = templateStart > templateEnd
    const inScript = scriptStart > scriptEnd
    const inStyle = styleStart > styleEnd

    // 找到最近的有效标签
    if (inTemplate && templateStart >= scriptStart && templateStart >= styleStart) {
      return 'template'
    }
    if (inScript && scriptStart >= templateStart && scriptStart >= styleStart) {
      return 'script'
    }
    if (inStyle && styleStart >= templateStart && styleStart >= scriptStart) {
      return 'style'
    }

    return 'script' // 默认为 script
  }

  /**
   * 生成建议的 i18n key
   * @param text 中文文本
   * @returns 建议的 key
   */
  private suggestKey(text: string): string {
    // 简单实现：去除标点，转换为拼音首字母或常见翻译
    const cleanText = text.replace(/[，。！？、；：""''（）【】《》]/g, '')

    // 常见翻译映射
    const commonTranslations: Record<string, string> = {
      '请输入': 'placeholder_input',
      '请选择': 'placeholder_select',
      '操作成功': 'sucOpt',
      '操作失败': 'failOpt',
      '确定': 'confirm',
      '取消': 'cancel',
      '删除': 'delete',
      '编辑': 'edit',
      '保存': 'save',
      '提交': 'submit',
      '返回': 'back',
      '关闭': 'close',
      '查看': 'view',
      '搜索': 'search',
      '添加': 'add',
      '新增': 'add',
    }

    return commonTranslations[cleanText] || `key_${cleanText.substring(0, 10)}`
  }
}
