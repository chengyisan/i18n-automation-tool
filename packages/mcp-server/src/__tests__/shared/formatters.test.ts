import { describe, it, expect } from 'vitest'
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
import {
  formatScanResultMd,
  formatValidationResultMd,
  formatCoverageReportMd,
  formatReactiveIssuesMd,
  formatQualityIssuesMd,
  formatLayoutIssuesMd,
} from '../../shared/formatters'

describe('formatScanResultMd', () => {
  it('空数据场景 - 返回成功消息', () => {
    const result = formatScanResultMd([], [], [])
    expect(result).toContain('# 扫描结果')
    expect(result).toContain('✅ 未发现问题')
  })

  it('有数据场景 - 包含硬编码中文', () => {
    const hardcoded: HardcodedString[] = [
      {
        text: '请选择',
        line: 10,
        column: 5,
        context: 'template',
      },
    ]
    const result = formatScanResultMd(hardcoded, [], [])
    expect(result).toContain('🔍 硬编码中文')
    expect(result).toContain('请选择')
    expect(result).toContain('template')
  })

  it('有数据场景 - 包含不可转换中文', () => {
    const untranslatable: UntranslatableItem[] = [
      {
        text: '待审核',
        line: 20,
        column: 10,
        reason: 'backend-value',
        suggestion: '与后端协商改为 i18n key',
      },
    ]
    const result = formatScanResultMd([], untranslatable, [])
    expect(result).toContain('⚠️ 不可转换中文')
    expect(result).toContain('待审核')
    expect(result).toContain('后端值')
  })

  it('有数据场景 - 包含重复翻译 key', () => {
    const duplicates: DuplicateKey[] = [
      {
        key: 'common.yes',
        value: '是',
        count: 3,
        locations: [
          { filePath: 'a.json', line: 1 },
          { filePath: 'b.json', line: 2 },
          { filePath: 'c.json', line: 3 },
        ],
      },
    ]
    const result = formatScanResultMd([], [], duplicates)
    expect(result).toContain('🔄 重复翻译 key')
    expect(result).toContain('common.yes')
    expect(result).toContain('是')
  })

  it('数据截断 - 超过 50 条只显示前 50 条', () => {
    const hardcoded: HardcodedString[] = Array.from({ length: 100 }, (_, i) => ({
      text: `文本${i}`,
      line: i,
      column: 0,
      context: 'template' as const,
    }))
    const result = formatScanResultMd(hardcoded, [], [])
    expect(result).toContain('仅显示前 50 条，共 100 条')
  })
})

describe('formatValidationResultMd', () => {
  it('空数据场景 - 返回验证通过', () => {
    const keyResult: KeyIntegrityResult = {
      baseLocale: 'zh-CN',
      locales: ['zh-CN', 'en-US'],
      totalKeys: 0,
      issues: [],
      localeStats: {},
    }
    const result = formatValidationResultMd([], keyResult)
    expect(result).toContain('# 验证结果')
    expect(result).toContain('✅ 验证通过')
  })

  it('有数据场景 - 包含配置错误', () => {
    const configIssues: ValidationError[] = [
      {
        filePath: '.i18nrc.json',
        line: 5,
        message: '缺少 locales 字段',
        rule: 'config-validation',
      },
    ]
    const keyResult: KeyIntegrityResult = {
      baseLocale: 'zh-CN',
      locales: ['zh-CN', 'en-US'],
      totalKeys: 100,
      issues: [],
      localeStats: {},
    }
    const result = formatValidationResultMd(configIssues, keyResult)
    expect(result).toContain('⚠️ 配置问题')
    expect(result).toContain('缺少 locales 字段')
  })

  it('有数据场景 - 包含 key 完整性问题', () => {
    const keyResult: KeyIntegrityResult = {
      baseLocale: 'zh-CN',
      locales: ['zh-CN', 'en-US'],
      totalKeys: 100,
      issues: [
        {
          type: 'missing_translation_key',
          severity: 'error',
          message: '缺失翻译 key',
          suggestion: '添加翻译',
          locale: 'en-US',
          key: 'common.yes',
        },
      ],
      localeStats: {
        'zh-CN': { missing: 0, extra: 0, total: 100 },
        'en-US': { missing: 1, extra: 0, total: 99 },
      },
    }
    const result = formatValidationResultMd([], keyResult)
    expect(result).toContain('Key 完整性统计')
    expect(result).toContain('缺失翻译 key')
  })
})

describe('formatCoverageReportMd', () => {
  it('空数据场景 - 显示零覆盖率', () => {
    const report: CoverageReport = {
      totalFiles: 0,
      filesWithChinese: 0,
      totalChineseStrings: 0,
      convertedStrings: 0,
      coverage: 0,
      files: [],
    }
    const keyResult: KeyIntegrityResult = {
      baseLocale: 'zh-CN',
      locales: ['zh-CN', 'en-US'],
      totalKeys: 0,
      issues: [],
      localeStats: {},
    }
    const result = formatCoverageReportMd(report, keyResult)
    expect(result).toContain('# 覆盖率报告')
    expect(result).toContain('覆盖率: 0.00%')
  })

  it('有数据场景 - 显示文件详情', () => {
    const report: CoverageReport = {
      totalFiles: 10,
      filesWithChinese: 5,
      totalChineseStrings: 100,
      convertedStrings: 80,
      coverage: 80,
      files: [
        {
          path: 'src/App.vue',
          totalStrings: 20,
          convertedStrings: 16,
          coverage: 80,
        },
      ],
    }
    const keyResult: KeyIntegrityResult = {
      baseLocale: 'zh-CN',
      locales: ['zh-CN', 'en-US'],
      totalKeys: 100,
      issues: [],
      localeStats: {
        'zh-CN': { missing: 0, extra: 0, total: 100 },
        'en-US': { missing: 0, extra: 0, total: 100 },
      },
    }
    const result = formatCoverageReportMd(report, keyResult)
    expect(result).toContain('文件详情')
    expect(result).toContain('src/App.vue')
  })
})

describe('formatReactiveIssuesMd', () => {
  it('空数据场景 - 返回成功消息', () => {
    const result = formatReactiveIssuesMd([], [])
    expect(result).toContain('# 响应式问题')
    expect(result).toContain('✅ 未发现响应式问题')
  })

  it('有数据场景 - 包含响应式问题', () => {
    const reactiveIssues: ReactiveIssue[] = [
      {
        type: 'ref-with-t',
        filePath: 'src/App.vue',
        line: 10,
        column: 5,
        code: 'const title = ref(t("common.title"))',
        suggestion: '使用 computed 替代 ref',
      },
    ]
    const result = formatReactiveIssuesMd(reactiveIssues, [])
    expect(result).toContain('⚠️ 响应式问题')
    expect(result).toContain('ref-with-t')
    expect(result).toContain('使用 computed 替代 ref')
  })

  it('有数据场景 - 包含模板拼接问题', () => {
    const concatIssues: TemplateConcatIssue[] = [
      {
        type: 'template-concat-missing-space',
        filePath: 'src/App.vue',
        line: 20,
        code: '`${t("common.hello")}${name}`',
        suggestion: '在模板拼接时添加空格',
      },
    ]
    const result = formatReactiveIssuesMd([], concatIssues)
    expect(result).toContain('🔤 模板拼接问题')
    expect(result).toContain('在模板拼接时添加空格')
  })

  it('数据截断 - 超过 50 条只显示前 50 条', () => {
    const reactiveIssues: ReactiveIssue[] = Array.from({ length: 100 }, (_, i) => ({
      type: 'ref-with-t' as const,
      filePath: `src/App${i}.vue`,
      line: i,
      column: 0,
      code: `const title${i} = ref(t("title"))`,
      suggestion: '使用 computed',
    }))
    const result = formatReactiveIssuesMd(reactiveIssues, [])
    expect(result).toContain('仅显示前 50 条，共 100 条')
  })
})

describe('formatQualityIssuesMd', () => {
  it('空数据场景 - 返回成功消息', () => {
    const result = formatQualityIssuesMd([])
    expect(result).toContain('# 质量问题')
    expect(result).toContain('✅ 未发现质量问题')
  })

  it('有数据场景 - 按 severity 分组', () => {
    const issues: QualityIssue[] = [
      {
        type: 'chinglish',
        severity: 'error',
        message: '发现中式英语',
        suggestion: '改为地道英语表达',
        context: 'Please kindly help to...',
      },
      {
        type: 'redundancy',
        severity: 'warning',
        message: '冗余表达',
        suggestion: '简化表达',
        context: 'basic fundamentals',
      },
      {
        type: 'rtl',
        severity: 'info',
        message: 'RTL 语言拼接问题',
        suggestion: '使用插值而非拼接',
        context: 'ar-SA',
      },
    ]
    const result = formatQualityIssuesMd(issues)
    expect(result).toContain('❌ 错误')
    expect(result).toContain('⚠️ 警告')
    expect(result).toContain('ℹ️ 提示')
    expect(result).toContain('中式英语')
    expect(result).toContain('冗余表达')
    expect(result).toContain('RTL 语言拼接问题')
  })

  it('数据截断 - 每个分组超过 50 条只显示前 50 条', () => {
    const errorIssues: QualityIssue[] = Array.from({ length: 100 }, (_, i) => ({
      type: 'chinglish' as const,
      severity: 'error' as const,
      message: `问题${i}`,
      suggestion: '修复',
      context: 'test',
    }))
    const result = formatQualityIssuesMd(errorIssues)
    expect(result).toContain('仅显示前 50 条，共 100 条')
  })
})

describe('formatLayoutIssuesMd', () => {
  it('空数据场景 - 返回成功消息', () => {
    const result = formatLayoutIssuesMd([])
    expect(result).toContain('# 布局问题')
    expect(result).toContain('✅ 未发现布局问题')
  })

  it('有数据场景 - 显示布局问题', () => {
    const issues: LayoutIssue[] = [
      {
        type: 'fixed_width',
        severity: 'warning',
        message: '固定宽度可能导致多语言布局问题',
        suggestion: '改为弹性布局',
        file: 'src/App.vue',
        property: 'width',
        value: '200px',
      },
    ]
    const result = formatLayoutIssuesMd(issues)
    expect(result).toContain('📐 问题详情')
    expect(result).toContain('fixed_width')
    expect(result).toContain('改为弹性布局')
  })

  it('数据截断 - 超过 50 条只显示前 50 条', () => {
    const issues: LayoutIssue[] = Array.from({ length: 100 }, (_, i) => ({
      type: 'fixed_width' as const,
      severity: 'warning' as const,
      message: `问题${i}`,
      suggestion: '修复',
      file: `src/App${i}.vue`,
      property: 'width',
      value: '200px',
    }))
    const result = formatLayoutIssuesMd(issues)
    expect(result).toContain('仅显示前 50 条，共 100 条')
  })
})

