import { describe, it, expect } from 'vitest'
import { handler as checkQualityHandler } from '../../tools/checkQuality.js'
import { join } from 'path'

const FIXTURES_DIR = join(__dirname, '../fixtures')
const SAMPLE_LOCALE_DIR = join(FIXTURES_DIR, 'sample-locale')
const CONFIG_PATH = join(FIXTURES_DIR, '.i18nrc.json')

describe('checkQuality', () => {
  it('应该检查翻译质量', async () => {
    const result = await checkQualityHandler({
      path: SAMPLE_LOCALE_DIR,
      locale: 'en-US',
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('质量问题')
    expect(result.content[0].text).toContain('统计')
  })

  it('应该检查所有语言（未指定 locale）', async () => {
    const result = await checkQualityHandler({
      path: SAMPLE_LOCALE_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('质量问题')
  })

  it('应该在语言包文件不存在时返回错误', async () => {
    const result = await checkQualityHandler({
      path: SAMPLE_LOCALE_DIR,
      locale: 'fr-FR',
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    // 应该包含缺失文件的错误
    expect(result.content[0].text).toContain('质量问题')
  })

  it('应该在路径不存在时返回错误', async () => {
    const result = await checkQualityHandler({
      path: '/nonexistent/path',
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('路径不存在')
  })
})
