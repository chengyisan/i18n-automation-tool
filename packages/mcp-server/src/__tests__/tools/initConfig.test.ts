import { describe, it, expect } from 'vitest'
import { handler as initConfigHandler } from '../../tools/initConfig.js'
import { join } from 'path'

const FIXTURES_DIR = join(__dirname, '../fixtures')
const SAMPLE_VUE_DIR = join(FIXTURES_DIR, 'sample-vue')

describe('initConfig', () => {
  it('应该生成默认配置', async () => {
    const result = await initConfigHandler({
      path: SAMPLE_VUE_DIR,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('配置文件内容')
    expect(result.content[0].text).toContain('.i18nrc.json')
    expect(result.content[0].text).toContain('```json')
    expect(result.content[0].text).toContain('zh-CN')
    expect(result.content[0].text).toContain('en-US')
  })

  it('应该使用自定义参数生成配置', async () => {
    const result = await initConfigHandler({
      path: SAMPLE_VUE_DIR,
      locales: ['en-US', 'ja-JP'],
      defaultLocale: 'en-US',
      langDir: 'i18n',
      enableQualityChecks: false,
      enableReactiveChecks: true,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('en-US')
    expect(result.content[0].text).toContain('ja-JP')
    expect(result.content[0].text).toContain('i18n')
  })

  it('应该包含所有必要的配置项', async () => {
    const result = await initConfigHandler({
      path: SAMPLE_VUE_DIR,
    })

    const text = result.content[0].text

    // 检查关键配置项
    expect(text).toContain('locales')
    expect(text).toContain('defaultLocale')
    expect(text).toContain('langDir')
    expect(text).toContain('qualityChecks')
    expect(text).toContain('reactiveChecks')
    expect(text).toContain('layoutChecks')
    expect(text).toContain('untranslatablePatterns')
  })

  it('应该在路径不存在时返回错误', async () => {
    const result = await initConfigHandler({
      path: '/nonexistent/path',
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('路径不存在')
  })
})
