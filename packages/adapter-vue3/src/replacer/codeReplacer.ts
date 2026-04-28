// @i18n-tool/adapter-vue3
// 代码替换器 — 将 Vue SFC 中的硬编码中文替换为 t() 调用

import { parse as babelParse } from '@babel/parser'
import _traverse from '@babel/traverse'
import { parse as vueParse } from '@vue/compiler-sfc'
import type { ReplacementResult } from '../types.js'

// 处理 @babel/traverse 的 ESM 导入兼容问题
const traverse = (_traverse as any).default || _traverse

/** 检测字符串是否包含中文 */
const containsChinese = (text: string): boolean => /[\u4e00-\u9fa5]/.test(text)

/** 检测文本是否已经在使用 t() 或 $t() */
const isAlreadyWrapped = (text: string): boolean =>
  /\bt\s*\(/.test(text) || /\$t\s*\(/.test(text)

/** 替换记录（内部结构，包含偏移量） */
interface InternalReplacement {
  original: string
  replacement: string
  key: string
  line: number
  context: 'template' | 'script'
  start: number
  end: number
}

/** script 块信息 */
interface ScriptBlockInfo {
  content: string
  startOffset: number
  endOffset: number
  isSetup: boolean
}

/** 自动注入结果 */
interface EnsureUseI18nResult {
  content: string
  addedImports: string[]
}

/**
 * 代码替换器
 * 将 Vue SFC 中的硬编码中文替换为 t() 调用
 */
export class CodeReplacer {
  private keyCounter = 0

  /**
   * 替换源代码中的硬编码中文
   * @param source - Vue SFC 源代码
   * @param filePath - 文件路径
   * @param keyPrefix - i18n key 前缀（可选，默认从文件路径生成）
   */
  replace(source: string, filePath: string, keyPrefix?: string): ReplacementResult {
    this.keyCounter = 0

    const prefix = keyPrefix || this.generateKeyPrefix(filePath)
    const replacements: InternalReplacement[] = []
    const addedImports: string[] = []

    const { descriptor, errors } = vueParse(source, { filename: filePath })
    if (errors.length > 0) {
      throw new Error(`SFC 解析失败 (${filePath}): ${errors[0].message}`)
    }

    let modifiedContent = source

    if (descriptor.template) {
      const templateStartOffset = this.findBlockContentStart(
        source,
        descriptor.template.content,
        descriptor.template.loc.start.offset
      )

      const templateReplacements = this.replaceInTemplate(
        descriptor.template.content,
        descriptor.template.loc.start.line,
        templateStartOffset,
        prefix
      )
      replacements.push(...templateReplacements)
    }

    const targetScriptBlock = descriptor.scriptSetup || descriptor.script
    if (targetScriptBlock) {
      const scriptStartOffset = this.findBlockContentStart(
        source,
        targetScriptBlock.content,
        targetScriptBlock.loc.start.offset
      )

      const scriptReplacements = this.replaceInScript(
        targetScriptBlock.content,
        targetScriptBlock.loc.start.line,
        scriptStartOffset,
        prefix,
        targetScriptBlock.lang === 'ts' || targetScriptBlock.lang === 'tsx'
      )
      replacements.push(...scriptReplacements)
    }

    const sortedReplacements = [...replacements].sort((a, b) => b.start - a.start)
    for (const replacement of sortedReplacements) {
      modifiedContent =
        modifiedContent.slice(0, replacement.start) +
        replacement.replacement +
        modifiedContent.slice(replacement.end)
    }

    if (replacements.length > 0) {
      const ensureResult = this.ensureUseI18n(modifiedContent)
      modifiedContent = ensureResult.content
      addedImports.push(...ensureResult.addedImports)
    }

    return {
      filePath,
      originalContent: source,
      modifiedContent,
      replacements: replacements.map(({ start, end, ...rest }) => rest),
      addedImports,
    }
  }

  /** 基于文件路径生成 key 前缀 */
  private generateKeyPrefix(filePath: string): string {
    const normalizedPath = filePath.replace(/\\/g, '/')
    const fileName = normalizedPath.split('/').pop()?.replace(/\.vue$/, '') || 'component'

    return this.toCamelCase(fileName)
  }

  /** 转换为 camelCase */
  private toCamelCase(value: string): string {
    const normalized = value
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[_.\s]+/g, '-')
      .replace(/-+/g, '-')

    const segments = normalized.split('-').filter(Boolean)
    if (segments.length === 0) {
      return 'component'
    }

    return segments
      .map((segment, index) => {
        const lowerSegment = segment.toLowerCase()
        if (index === 0) {
          return lowerSegment
        }

        return lowerSegment.charAt(0).toUpperCase() + lowerSegment.slice(1)
      })
      .join('')
  }

  /** 生成递增 key */
  private nextKey(prefix: string): string {
    this.keyCounter += 1
    return `${prefix}.text${this.keyCounter}`
  }

  /** 替换 template 中的硬编码中文 */
  private replaceInTemplate(
    templateContent: string,
    templateStartLine: number,
    templateStartOffset: number,
    prefix: string
  ): InternalReplacement[] {
    const replacements: InternalReplacement[] = []
    const maskedTemplate = this.maskHtmlComments(templateContent)

    // 1. 替换静态属性值中的中文：title="中文" -> :title="t('key')"
    const attributeRegex = /(\s)([A-Za-z_][\w:-]*)="([^"]*[\u4e00-\u9fa5][^"]*)"/g
    let attributeMatch: RegExpExecArray | null

    while ((attributeMatch = attributeRegex.exec(maskedTemplate)) !== null) {
      const fullMatch = attributeMatch[0]
      const leadingWhitespace = attributeMatch[1]
      const attributeName = attributeMatch[2]
      const attributeValue = attributeMatch[3]

      // 排除动态绑定、事件、指令参数等
      if (
        attributeName.startsWith(':') ||
        attributeName.startsWith('@') ||
        attributeName.startsWith('v-')
      ) {
        continue
      }

      if (!containsChinese(attributeValue) || isAlreadyWrapped(attributeValue)) {
        continue
      }

      const key = this.nextKey(prefix)
      const line = templateStartLine + this.countLinesBefore(templateContent, attributeMatch.index)

      replacements.push({
        original: attributeValue,
        replacement: `${leadingWhitespace}:${attributeName}="t('${key}')"`,
        key,
        line,
        context: 'template',
        start: templateStartOffset + attributeMatch.index,
        end: templateStartOffset + attributeMatch.index + fullMatch.length,
      })
    }

    // 2. 替换纯文本节点中的中文：中文 -> {{ t('key') }}
    const textNodeRegex = /(?<=>)([^<]*[\u4e00-\u9fa5][^<]*)(?=<)/g
    let textMatch: RegExpExecArray | null

    while ((textMatch = textNodeRegex.exec(maskedTemplate)) !== null) {
      const fullText = textMatch[1]
      const trimmedText = fullText.trim()

      if (!trimmedText) {
        continue
      }

      // 跳过插值表达式、已有 t()、模板注释残留
      if (
        trimmedText.includes('{{') ||
        trimmedText.includes('}}') ||
        isAlreadyWrapped(trimmedText)
      ) {
        continue
      }

      if (!containsChinese(trimmedText)) {
        continue
      }

      const key = this.nextKey(prefix)
      const leadingWhitespaceLength = fullText.indexOf(trimmedText)
      const absoluteStart = templateStartOffset + textMatch.index + leadingWhitespaceLength
      const line = templateStartLine + this.countLinesBefore(templateContent, textMatch.index)

      replacements.push({
        original: trimmedText,
        replacement: `{{ t('${key}') }}`,
        key,
        line,
        context: 'template',
        start: absoluteStart,
        end: absoluteStart + trimmedText.length,
      })
    }

    return replacements
  }

  /** 替换 script 中的硬编码中文字符串 */
  private replaceInScript(
    scriptContent: string,
    scriptStartLine: number,
    scriptStartOffset: number,
    prefix: string,
    isTypeScript: boolean
  ): InternalReplacement[] {
    const replacements: InternalReplacement[] = []

    if (!containsChinese(scriptContent)) {
      return replacements
    }

    const plugins: Array<any> = ['jsx']
    if (isTypeScript) {
      plugins.push('typescript')
    }

    const ast = babelParse(scriptContent, {
      sourceType: 'module',
      plugins,
      errorRecovery: true,
    })

    traverse(ast, {
      StringLiteral: (path: any) => {
        const node = path.node
        const value = node.value as string

        if (!containsChinese(value)) {
          return
        }

        if (this.shouldSkipStringLiteral(path)) {
          return
        }

        const key = this.nextKey(prefix)
        const rawValue = scriptContent.slice(node.start, node.end)
        const line = scriptStartLine + node.loc.start.line - 1

        replacements.push({
          original: rawValue,
          replacement: `t('${key}')`,
          key,
          line,
          context: 'script',
          start: scriptStartOffset + node.start,
          end: scriptStartOffset + node.end,
        })
      },
    })

    return replacements
  }

  /** 判断字符串字面量是否应该跳过替换 */
  private shouldSkipStringLiteral(path: any): boolean {
    const parent = path.parent
    const parentType = parent?.type

    // 已经是 t('中文') / $t('中文') 的参数时不重复替换
    if (parentType === 'CallExpression') {
      const callee = parent.callee
      if (callee?.type === 'Identifier' && callee.name === 't') {
        return true
      }
      if (callee?.type === 'Identifier' && callee.name === '$t') {
        return true
      }
      if (callee?.type === 'MemberExpression' && callee.property?.name === '$t') {
        return true
      }
    }

    // import/export source 不是业务字符串
    if (
      parentType === 'ImportDeclaration' ||
      parentType === 'ExportAllDeclaration' ||
      parentType === 'ExportNamedDeclaration'
    ) {
      return true
    }

    // 对象字面量的 key 不应替换，否则语法会被破坏
    if (parentType === 'ObjectProperty' && parent.key === path.node && !parent.computed) {
      return true
    }

    // class/property/method 名称中的字面量 key 不处理
    if (
      (parentType === 'ClassProperty' ||
        parentType === 'ClassMethod' ||
        parentType === 'ObjectMethod') &&
      parent.key === path.node &&
      !parent.computed
    ) {
      return true
    }

    // TypeScript 字面量类型不应替换
    if (parentType === 'TSLiteralType') {
      return true
    }

    return false
  }

  /** 确保存在 useI18n 导入和 t 解构 */
  private ensureUseI18n(source: string): EnsureUseI18nResult {
    const addedImports: string[] = []
    const { descriptor, errors } = vueParse(source)

    if (errors.length > 0) {
      return {
        content: source,
        addedImports,
      }
    }

    const targetBlock = this.getTargetScriptBlock(source, descriptor)

    if (!targetBlock) {
      const newBlock = [
        '<script setup>',
        "import { useI18n } from 'vue-i18n'",
        '',
        'const { t } = useI18n()',
        '</script>',
        '',
      ].join('\n')

      addedImports.push("import { useI18n } from 'vue-i18n'")
      addedImports.push('const { t } = useI18n()')

      if (descriptor.template) {
        const insertOffset = descriptor.template.loc.start.offset
        return {
          content: source.slice(0, insertOffset) + newBlock + source.slice(insertOffset),
          addedImports,
        }
      }

      return {
        content: newBlock + source,
        addedImports,
      }
    }

    let nextBlockContent = targetBlock.content

    const hasUseI18nImport = /import\s*\{[^}]*\buseI18n\b[^}]*\}\s*from\s*['"]vue-i18n['"]/.test(
      nextBlockContent
    )
    const hasTDestructure = /(const|let|var)\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\s*\(/s.test(
      nextBlockContent
    )

    if (!hasUseI18nImport) {
      const importStatement = "import { useI18n } from 'vue-i18n'\n"
      const importInsertIndex = this.findImportInsertIndex(nextBlockContent)
      nextBlockContent =
        nextBlockContent.slice(0, importInsertIndex) +
        importStatement +
        nextBlockContent.slice(importInsertIndex)
      addedImports.push("import { useI18n } from 'vue-i18n'")
    }

    if (!hasTDestructure) {
      const setupStatement = this.buildUseI18nStatement(nextBlockContent)
      const statementInsertIndex = this.findStatementInsertIndex(nextBlockContent)
      nextBlockContent =
        nextBlockContent.slice(0, statementInsertIndex) +
        setupStatement +
        nextBlockContent.slice(statementInsertIndex)
      addedImports.push('const { t } = useI18n()')
    }

    if (nextBlockContent === targetBlock.content) {
      return {
        content: source,
        addedImports,
      }
    }

    return {
      content:
        source.slice(0, targetBlock.startOffset) +
        nextBlockContent +
        source.slice(targetBlock.endOffset),
      addedImports,
    }
  }

  /** 获取优先注入 useI18n 的 script 块 */
  private getTargetScriptBlock(source: string, descriptor: ReturnType<typeof vueParse>['descriptor']): ScriptBlockInfo | null {
    const block = descriptor.scriptSetup || descriptor.script
    if (!block) {
      return null
    }

    const startOffset = this.findBlockContentStart(source, block.content, block.loc.start.offset)

    return {
      content: block.content,
      startOffset,
      endOffset: startOffset + block.content.length,
      isSetup: Boolean(descriptor.scriptSetup),
    }
  }

  /** 构造 useI18n 解构语句 */
  private buildUseI18nStatement(scriptContent: string): string {
    const prefix = this.findImportInsertIndex(scriptContent) > 0 ? '\n' : ''
    return `${prefix}const { t } = useI18n()\n\n`
  }

  /** 查找 import 语句插入位置 */
  private findImportInsertIndex(scriptContent: string): number {
    const importRegex = /^import\s+.*from\s+['"][^'"]+['"];?\s*$/gm
    let lastMatch: RegExpExecArray | null = null
    let currentMatch: RegExpExecArray | null

    while ((currentMatch = importRegex.exec(scriptContent)) !== null) {
      lastMatch = currentMatch
    }

    if (!lastMatch) {
      return 0
    }

    return lastMatch.index + lastMatch[0].length
  }

  /** 查找普通语句插入位置（放在 import 之后） */
  private findStatementInsertIndex(scriptContent: string): number {
    const importInsertIndex = this.findImportInsertIndex(scriptContent)
    if (importInsertIndex > 0) {
      return importInsertIndex
    }

    return 0
  }

  /** 定位 block content 在完整 SFC 中的起始偏移量 */
  private findBlockContentStart(source: string, blockContent: string, searchOffset: number): number {
    const exactIndex = source.indexOf(blockContent, searchOffset)
    if (exactIndex >= 0) {
      return exactIndex
    }

    const fallbackIndex = source.indexOf(blockContent)
    if (fallbackIndex >= 0) {
      return fallbackIndex
    }

    throw new Error('无法定位 SFC block content 的起始位置')
  }

  /** 将 HTML 注释替换为空白，保证索引不变 */
  private maskHtmlComments(templateContent: string): string {
    return templateContent.replace(/<!--[\s\S]*?-->/g, (match) => ' '.repeat(match.length))
  }

  /** 统计指定偏移量之前的换行数 */
  private countLinesBefore(content: string, offset: number): number {
    let lineCount = 0
    for (let index = 0; index < offset; index += 1) {
      if (content[index] === '\n') {
        lineCount += 1
      }
    }

    return lineCount
  }
}
