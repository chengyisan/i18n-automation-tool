import { parse as sfcParse } from '@vue/compiler-sfc'
import { parse as babelParse } from '@babel/parser'
import type { ParsedVueSfc } from '../types.js'

/**
 * Vue SFC 解析器
 *
 * 使用 @vue/compiler-sfc 解析 .vue 文件，分离 template/script/style 块
 */
export function parseSfc(source: string, filePath: string): ParsedVueSfc {
  const { descriptor, errors } = sfcParse(source, {
    filename: filePath,
  })

  if (errors.length > 0) {
    throw new Error(`SFC 解析错误 (${filePath}): ${errors[0].message}`)
  }

  return {
    template: parseTemplate(descriptor),
    script: parseScript(descriptor.script, filePath),
    scriptSetup: parseScript(descriptor.scriptSetup, filePath),
    styles: parseStyles(descriptor),
    filePath,
  }
}

/** 解析 template 块 */
function parseTemplate(
  descriptor: ReturnType<typeof sfcParse>['descriptor']
): ParsedVueSfc['template'] {
  if (!descriptor.template) return null

  return {
    content: descriptor.template.content,
    ast: descriptor.template.ast,
    startLine: descriptor.template.loc.start.line,
  }
}

/** 解析 script 块（普通或 setup） */
function parseScript(
  block: ReturnType<typeof sfcParse>['descriptor']['script'],
  filePath: string
): ParsedVueSfc['script'] {
  if (!block) return null

  const lang = (block.lang === 'ts' || block.lang === 'tsx') ? 'ts' : 'js'

  const plugins: any[] = ['jsx']
  if (lang === 'ts') {
    plugins.push('typescript')
  }

  let ast: any = null
  try {
    ast = babelParse(block.content, {
      sourceType: 'module',
      plugins,
    })
  } catch {
    // AST 解析失败时仍返回内容，只是 ast 为 null
  }

  return {
    content: block.content,
    ast,
    startLine: block.loc.start.line,
    lang,
  }
}

/** 解析 style 块列表 */
function parseStyles(
  descriptor: ReturnType<typeof sfcParse>['descriptor']
): ParsedVueSfc['styles'] {
  return descriptor.styles.map((style) => ({
    content: style.content,
    startLine: style.loc.start.line,
    scoped: style.scoped ?? false,
  }))
}

/** 导出为类，兼容 index.ts 的导出方式 */
export class VueSfcParser {
  parse(source: string, filePath: string): ParsedVueSfc {
    return parseSfc(source, filePath)
  }
}
