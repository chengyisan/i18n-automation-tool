import type {
  HardcodedString,
  UntranslatableItem,
  DuplicateKey,
  ValidationError,
  ValidationWarning,
  KeyIntegrityResult,
  CoverageReport,
  QualityIssue,
  LayoutIssue,
} from '@i18n-tool/core'
import type { ReactiveIssue, TemplateConcatIssue } from '@i18n-tool/adapter-vue3'

/**
 * 格式化扫描结果为 Markdown
 */
export function formatScanResultMd(
  hardcoded: HardcodedString[],
  untranslatable: UntranslatableItem[],
  duplicates: DuplicateKey[]
): string {
  const sections: string[] = []

  sections.push('# 扫描结果\n')

  // 统计
  sections.push('## 📊 统计')
  sections.push(`- 硬编码中文: ${hardcoded.length} 处`)
  sections.push(`- 不可转换中文: ${untranslatable.length} 处`)
  sections.push(`- 重复翻译 key: ${duplicates.length} 个\n`)

  // 硬编码中文详情
  if (hardcoded.length > 0) {
    sections.push('## 🔍 硬编码中文')
    sections.push('| 文件 | 行号 | 内容 | 上下文 |')
    sections.push('|------|------|------|--------|')
    const displayCount = Math.min(hardcoded.length, 50)
    hardcoded.slice(0, displayCount).forEach((item) => {
      const content = item.text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
      sections.push(`| ${item.line} | ${item.column} | ${content} | ${item.context} |`)
    })
    if (hardcoded.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${hardcoded.length} 条_\n`)
    }
  }

  // 不可转换中文详情
  if (untranslatable.length > 0) {
    sections.push('\n## ⚠️ 不可转换中文')
    sections.push('| 行号 | 内容 | 原因 | 建议 |')
    sections.push('|------|------|------|------|')
    const displayCount = Math.min(untranslatable.length, 50)
    untranslatable.slice(0, displayCount).forEach((item) => {
      const content = item.text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
      const reasonText = {
        'backend-value': '后端值',
        'image-text': '图片文字',
        'svg-text': 'SVG 文字',
        'dynamic-string': '动态字符串',
      }[item.reason] || item.reason
      const suggestion = item.suggestion.replace(/\|/g, '\\|')
      sections.push(`| ${item.line} | ${content} | ${reasonText} | ${suggestion} |`)
    })
    if (untranslatable.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${untranslatable.length} 条_\n`)
    }
  }

  // 重复翻译 key 详情
  if (duplicates.length > 0) {
    sections.push('\n## 🔄 重复翻译 key')
    sections.push('| Key | 值 | 出现次数 | 位置 |')
    sections.push('|-----|-----|----------|------|')
    const displayCount = Math.min(duplicates.length, 50)
    duplicates.slice(0, displayCount).forEach((item) => {
      const value = item.value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
      const locations = item.locations.map(loc => `${loc.filePath}:${loc.line}`).join(', ')
      sections.push(`| ${item.key} | ${value} | ${item.count} | ${locations} |`)
    })
    if (duplicates.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${duplicates.length} 条_\n`)
    }
  }

  // 如果都没有问题
  if (hardcoded.length === 0 && untranslatable.length === 0 && duplicates.length === 0) {
    sections.push('\n✅ 未发现问题')
  }

  return sections.join('\n')
}

/**
 * 格式化验证结果为 Markdown
 */
export function formatValidationResultMd(
  configIssues: (ValidationError | ValidationWarning)[],
  keyResult: KeyIntegrityResult
): string {
  const sections: string[] = []

  sections.push('# 验证结果\n')

  // 配置问题
  if (configIssues.length > 0) {
    sections.push('## ⚠️ 配置问题')
    sections.push('| 文件 | 行号 | 规则 | 消息 |')
    sections.push('|------|------|------|------|')
    const displayCount = Math.min(configIssues.length, 50)
    configIssues.slice(0, displayCount).forEach((issue) => {
      const line = issue.line !== undefined ? issue.line.toString() : '-'
      const message = issue.message.replace(/\|/g, '\\|')
      sections.push(`| ${issue.filePath} | ${line} | ${issue.rule} | ${message} |`)
    })
    if (configIssues.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${configIssues.length} 条_\n`)
    }
  }

  // Key 完整性统计
  sections.push('\n## 📊 Key 完整性统计')
  sections.push(`- 基准语言: ${keyResult.baseLocale}`)
  sections.push(`- 总 key 数: ${keyResult.totalKeys}`)
  sections.push(`- 问题数: ${keyResult.issues.length}\n`)

  // 各语言统计
  if (Object.keys(keyResult.localeStats).length > 0) {
    sections.push('### 各语言统计')
    sections.push('| 语言 | 缺失 key | 多余 key | 总 key |')
    sections.push('|------|----------|----------|--------|')
    Object.entries(keyResult.localeStats).forEach(([locale, stats]) => {
      sections.push(`| ${locale} | ${stats.missing} | ${stats.extra} | ${stats.total} |`)
    })
    sections.push('')
  }

  // Key 问题详情
  if (keyResult.issues.length > 0) {
    sections.push('### Key 问题详情')
    sections.push('| 类型 | 语言 | Key | 消息 |')
    sections.push('|------|------|-----|------|')
    const displayCount = Math.min(keyResult.issues.length, 50)
    keyResult.issues.slice(0, displayCount).forEach((issue) => {
      const locale = issue.locale || '-'
      const key = issue.key || '-'
      const message = issue.message.replace(/\|/g, '\\|')
      sections.push(`| ${issue.type} | ${locale} | ${key} | ${message} |`)
    })
    if (keyResult.issues.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${keyResult.issues.length} 条_\n`)
    }
  }

  // 如果都没有问题
  if (configIssues.length === 0 && keyResult.issues.length === 0) {
    sections.push('\n✅ 验证通过')
  }

  return sections.join('\n')
}

/**
 * 格式化覆盖率报告为 Markdown
 */
export function formatCoverageReportMd(
  report: CoverageReport,
  keyResult: KeyIntegrityResult
): string {
  const sections: string[] = []

  sections.push('# 覆盖率报告\n')

  // 总体统计
  sections.push('## 📊 总体统计')
  sections.push(`- 总文件数: ${report.totalFiles}`)
  sections.push(`- 包含中文的文件: ${report.filesWithChinese}`)
  sections.push(`- 总中文字符串数: ${report.totalChineseStrings}`)
  sections.push(`- 已转换字符串数: ${report.convertedStrings}`)
  sections.push(`- 覆盖率: ${report.coverage.toFixed(2)}%\n`)

  // Key 完整性统计
  sections.push('## 🔑 Key 完整性')
  sections.push(`- 基准语言: ${keyResult.baseLocale}`)
  sections.push(`- 总 key 数: ${keyResult.totalKeys}`)
  sections.push(`- 问题数: ${keyResult.issues.length}\n`)

  // 各语言统计
  if (Object.keys(keyResult.localeStats).length > 0) {
    sections.push('### 各语言统计')
    sections.push('| 语言 | 缺失 key | 多余 key | 完整性 |')
    sections.push('|------|----------|----------|--------|')
    Object.entries(keyResult.localeStats).forEach(([locale, stats]) => {
      const completeness = stats.total > 0 ? ((stats.total - stats.missing) / stats.total * 100).toFixed(2) : '100.00'
      sections.push(`| ${locale} | ${stats.missing} | ${stats.extra} | ${completeness}% |`)
    })
    sections.push('')
  }

  // 文件详情
  if (report.files.length > 0) {
    sections.push('### 文件详情')
    sections.push('| 文件 | 总字符串 | 已转换 | 覆盖率 |')
    sections.push('|------|----------|--------|--------|')
    const displayCount = Math.min(report.files.length, 50)
    report.files.slice(0, displayCount).forEach((file) => {
      sections.push(`| ${file.path} | ${file.totalStrings} | ${file.convertedStrings} | ${file.coverage.toFixed(2)}% |`)
    })
    if (report.files.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${report.files.length} 条_\n`)
    }
  }

  return sections.join('\n')
}

/**
 * 格式化响应式问题为 Markdown
 */
export function formatReactiveIssuesMd(
  reactiveIssues: ReactiveIssue[],
  concatIssues: TemplateConcatIssue[]
): string {
  const sections: string[] = []

  sections.push('# 响应式问题\n')

  // 统计
  sections.push('## 📊 统计')
  sections.push(`- 响应式问题: ${reactiveIssues.length} 处`)
  sections.push(`- 模板拼接问题: ${concatIssues.length} 处\n`)

  // 响应式问题详情
  if (reactiveIssues.length > 0) {
    sections.push('## ⚠️ 响应式问题')
    sections.push('| 文件 | 行号 | 类型 | 代码 | 建议 |')
    sections.push('|------|------|------|------|------|')
    const displayCount = Math.min(reactiveIssues.length, 50)
    reactiveIssues.slice(0, displayCount).forEach((issue) => {
      const code = issue.code.replace(/\|/g, '\\|').replace(/\n/g, ' ')
      const suggestion = issue.suggestion.replace(/\|/g, '\\|')
      sections.push(`| ${issue.filePath} | ${issue.line} | ${issue.type} | ${code} | ${suggestion} |`)
    })
    if (reactiveIssues.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${reactiveIssues.length} 条_\n`)
    }
  }

  // 模板拼接问题详情
  if (concatIssues.length > 0) {
    sections.push('\n## 🔤 模板拼接问题')
    sections.push('| 文件 | 行号 | 代码 | 建议 |')
    sections.push('|------|------|------|------|')
    const displayCount = Math.min(concatIssues.length, 50)
    concatIssues.slice(0, displayCount).forEach((issue) => {
      const code = issue.code.replace(/\|/g, '\\|').replace(/\n/g, ' ')
      const suggestion = issue.suggestion.replace(/\|/g, '\\|')
      sections.push(`| ${issue.filePath} | ${issue.line} | ${code} | ${suggestion} |`)
    })
    if (concatIssues.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${concatIssues.length} 条_\n`)
    }
  }

  // 如果都没有问题
  if (reactiveIssues.length === 0 && concatIssues.length === 0) {
    sections.push('\n✅ 未发现响应式问题')
  }

  return sections.join('\n')
}

/**
 * 格式化质量问题为 Markdown
 */
export function formatQualityIssuesMd(issues: QualityIssue[]): string {
  const sections: string[] = []

  sections.push('# 质量问题\n')

  // 按 severity 分组
  const errorIssues = issues.filter(i => i.severity === 'error')
  const warningIssues = issues.filter(i => i.severity === 'warning')
  const infoIssues = issues.filter(i => i.severity === 'info')

  // 统计
  sections.push('## 📊 统计')
  sections.push(`- 错误: ${errorIssues.length} 个`)
  sections.push(`- 警告: ${warningIssues.length} 个`)
  sections.push(`- 提示: ${infoIssues.length} 个\n`)

  // 错误
  if (errorIssues.length > 0) {
    sections.push('## ❌ 错误')
    sections.push('| 类型 | 消息 | 建议 | 上下文 |')
    sections.push('|------|------|------|--------|')
    const displayCount = Math.min(errorIssues.length, 50)
    errorIssues.slice(0, displayCount).forEach((issue) => {
      const message = issue.message.replace(/\|/g, '\\|')
      const suggestion = issue.suggestion.replace(/\|/g, '\\|')
      const context = issue.context ? issue.context.replace(/\|/g, '\\|').replace(/\n/g, ' ') : '-'
      sections.push(`| ${issue.type} | ${message} | ${suggestion} | ${context} |`)
    })
    if (errorIssues.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${errorIssues.length} 条_\n`)
    }
  }

  // 警告
  if (warningIssues.length > 0) {
    sections.push('\n## ⚠️ 警告')
    sections.push('| 类型 | 消息 | 建议 | 上下文 |')
    sections.push('|------|------|------|--------|')
    const displayCount = Math.min(warningIssues.length, 50)
    warningIssues.slice(0, displayCount).forEach((issue) => {
      const message = issue.message.replace(/\|/g, '\\|')
      const suggestion = issue.suggestion.replace(/\|/g, '\\|')
      const context = issue.context ? issue.context.replace(/\|/g, '\\|').replace(/\n/g, ' ') : '-'
      sections.push(`| ${issue.type} | ${message} | ${suggestion} | ${context} |`)
    })
    if (warningIssues.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${warningIssues.length} 条_\n`)
    }
  }

  // 提示
  if (infoIssues.length > 0) {
    sections.push('\n## ℹ️ 提示')
    sections.push('| 类型 | 消息 | 建议 | 上下文 |')
    sections.push('|------|------|------|--------|')
    const displayCount = Math.min(infoIssues.length, 50)
    infoIssues.slice(0, displayCount).forEach((issue) => {
      const message = issue.message.replace(/\|/g, '\\|')
      const suggestion = issue.suggestion.replace(/\|/g, '\\|')
      const context = issue.context ? issue.context.replace(/\|/g, '\\|').replace(/\n/g, ' ') : '-'
      sections.push(`| ${issue.type} | ${message} | ${suggestion} | ${context} |`)
    })
    if (infoIssues.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${infoIssues.length} 条_\n`)
    }
  }

  // 如果都没有问题
  if (issues.length === 0) {
    sections.push('\n✅ 未发现质量问题')
  }

  return sections.join('\n')
}

/**
 * 格式化布局问题为 Markdown
 */
export function formatLayoutIssuesMd(issues: LayoutIssue[]): string {
  const sections: string[] = []

  sections.push('# 布局问题\n')

  // 统计
  sections.push('## 📊 统计')
  sections.push(`- 总问题数: ${issues.length} 个\n`)

  // 问题详情
  if (issues.length > 0) {
    sections.push('## 📐 问题详情')
    sections.push('| 文件 | 类型 | 属性 | 值 | 建议 |')
    sections.push('|------|------|------|-----|------|')
    const displayCount = Math.min(issues.length, 50)
    issues.slice(0, displayCount).forEach((issue) => {
      const message = issue.message.replace(/\|/g, '\\|')
      const suggestion = issue.suggestion.replace(/\|/g, '\\|')
      sections.push(`| ${issue.file} | ${issue.type} | ${issue.property} | ${issue.value} | ${suggestion} |`)
    })
    if (issues.length > 50) {
      sections.push(`\n_仅显示前 50 条，共 ${issues.length} 条_\n`)
    }
  }

  // 如果没有问题
  if (issues.length === 0) {
    sections.push('\n✅ 未发现布局问题')
  }

  return sections.join('\n')
}

