import { parse as babelParse } from '@babel/parser'
import _traverse from '@babel/traverse'
import type { QualityIssue } from '../types.js'

// @babel/traverse ESM 兼容处理
const traverse = (_traverse as any).default || _traverse

/** 语言 code 格式正则（如 zh-CN, en-US, ar-SA） */
const LOCALE_CODE_PATTERN = /^(zh|en|ar|es|fr|de|ja|ko)(-[A-Z]{2})?$/

/**
 * 语言常量检测器
 *
 * 检测代码中硬编码的语言 code（如 'zh-CN', 'en-US'），提示使用常量统一管理
 */
export class LocaleConstantChecker {
  /**
   * 检查文件中的硬编码语言 code
   * @param filePath - 文件路径
   * @param content - 文件内容
   * @returns 质量问题列表
   */
  check(filePath: string, content: string): QualityIssue[] {
    const issues: QualityIssue[] = []

    let ast: any
    try {
      ast = babelParse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      })
    } catch {
      // 解析失败返回空数组
      return issues
    }

    traverse(ast, {
      StringLiteral(path: any) {
        const value = path.node.value

        // 检查是否为语言 code 格式
        if (!LOCALE_CODE_PATTERN.test(value)) return

        const parent = path.parent

        // 排除规则 1: 常量定义（变量名全大写或包含 LOCALE/LANG/DEFAULT/FALLBACK 关键词）
        if (
          parent.type === 'VariableDeclarator' &&
          path.parentPath.parent.kind === 'const' &&
          parent.id.type === 'Identifier'
        ) {
          const varName = parent.id.name
          // 检查变量名是否为常量命名风格
          const isConstantStyle =
            varName === varName.toUpperCase() || // 全大写
            /^(?:DEFAULT|FALLBACK|SUPPORTED)_(?:LOCALE|LANG)S?$/.test(varName) || // 标准常量命名
            /^(?:LOCALE|LANG)S?_(?:DEFAULT|FALLBACK|LIST)$/.test(varName) // 标准常量命名

          if (isConstantStyle) {
            return
          }
        }

        // 排除规则 2: 对象属性 key（如 { 'zh-CN': {...} }）
        if (parent.type === 'ObjectProperty' && parent.key === path.node) {
          return
        }

        // 排除规则 3: import/require 路径（如 import ... from 'locales/zh-CN/common'）
        if (parent.type === 'ImportDeclaration' || parent.type === 'CallExpression') {
          // 检测是否在 require() 或 import() 的路径参数中
          if (
            parent.type === 'CallExpression' &&
            (parent.callee.name === 'require' || parent.callee.name === 'import')
          ) {
            return
          }
          // 检测是否在 ImportDeclaration 的 source 中
          if (parent.type === 'ImportDeclaration') {
            return
          }
        }

        // 检测是否在文件路径字符串中（包含 / 或 \）
        if (value.includes('/') || value.includes('\\')) {
          return
        }

        // 排除规则 4: 注释中的语言 code 已被 @babel/parser 自动忽略

        // 生成警告
        const line = path.node.loc?.start.line || 1
        const column = path.node.loc?.start.column || 0
        const start = path.node.start || 0
        const end = path.node.end || 0

        // 提取前后 20 个字符作为上下文
        const contextStart = Math.max(0, start - 20)
        const contextEnd = Math.min(content.length, end + 20)
        const context = content.slice(contextStart, contextEnd)

        issues.push({
          type: 'locale-constant',
          severity: 'info',
          message: `硬编码的语言 code "${value}"`,
          suggestion: '建议引用 DEFAULT_LOCALE 或 FALLBACK_LOCALE 常量，避免全局搜索替换',
          position: { start, end },
          context,
        })
      },
    })

    return issues
  }
}

