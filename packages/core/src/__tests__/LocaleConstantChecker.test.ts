import { describe, it, expect } from 'vitest'
import { LocaleConstantChecker } from '../quality/LocaleConstantChecker.js'

describe('LocaleConstantChecker', () => {
  const checker = new LocaleConstantChecker()

  it('应检测赋值表达式中的硬编码语言 code', () => {
    const code = `
      const locale = 'zh-CN'
      locale.value = 'en-US'
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(2)
    expect(issues[0].type).toBe('locale-constant')
    expect(issues[0].severity).toBe('info')
    expect(issues[0].message).toContain('zh-CN')
    expect(issues[1].message).toContain('en-US')
  })

  it('应检测逻辑或表达式中的硬编码语言 code', () => {
    const code = `
      const locale = localStorage.getItem('locale') || 'zh-CN'
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(1)
    expect(issues[0].message).toContain('zh-CN')
    expect(issues[0].suggestion).toContain('DEFAULT_LOCALE')
  })

  it('应检测对象属性 value 中的硬编码语言 code', () => {
    const code = `
      const config = {
        fallbackLocale: 'zh-CN',
        locale: 'en-US'
      }
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(2)
    expect(issues[0].message).toContain('zh-CN')
    expect(issues[1].message).toContain('en-US')
  })

  it('应检测条件表达式中的硬编码语言 code', () => {
    const code = `
      const locale = isDev ? 'zh-CN' : 'en-US'
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(2)
    expect(issues[0].message).toContain('zh-CN')
    expect(issues[1].message).toContain('en-US')
  })

  it('不应误报常量定义（const）', () => {
    const code = `
      const DEFAULT_LOCALE = 'zh-CN'
      export const FALLBACK_LOCALE = 'en-US'
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(0)
  })

  it('不应误报对象属性 key', () => {
    const code = `
      const messages = {
        'zh-CN': { hello: '你好' },
        'en-US': { hello: 'Hello' }
      }
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(0)
  })

  it('不应误报文件路径', () => {
    const code = `
      import zhCN from 'locales/zh-CN/common.json'
      const path = 'locales/en-US/common.json'
      const path2 = 'locales\\\\zh-CN\\\\common.json'
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(0)
  })

  it('应检测各种语言 code 格式', () => {
    const code = `
      const zh = 'zh-CN'
      const en = 'en-US'
      const ar = 'ar-SA'
      const es = 'es-ES'
      const fr = 'fr'
      const de = 'de'
      const ja = 'ja'
      const ko = 'ko'
    `
    const issues = checker.check('test.ts', code)

    // 所有都应该被检测到
    expect(issues).toHaveLength(8)
  })

  it('不应检测非语言 code 的字符串', () => {
    const code = `
      const name = 'zh-hans'
      const path = 'zh_CN'
      const random = 'zh-cn'
      const other = 'en-us'
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(0)
  })

  it('解析失败时应返回空数组', () => {
    const code = `
      const invalid = 'zh-CN
    `
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(0)
  })

  it('应提供准确的位置信息和上下文', () => {
    const code = `const locale = localStorage.getItem('locale') || 'zh-CN'`
    const issues = checker.check('test.ts', code)

    expect(issues).toHaveLength(1)
    expect(issues[0].position).toBeDefined()
    expect(issues[0].position!.start).toBeGreaterThan(0)
    expect(issues[0].position!.end).toBeGreaterThan(issues[0].position!.start)
    expect(issues[0].context).toBeDefined()
    expect(issues[0].context).toContain('zh-CN')
  })
})


