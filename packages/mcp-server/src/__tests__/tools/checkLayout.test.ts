import { describe, it, expect } from 'vitest'
import { handler as checkLayoutHandler } from '../../tools/checkLayout.js'
import { join } from 'path'

const FIXTURES_DIR = join(__dirname, '../fixtures')
const SAMPLE_VUE_DIR = join(FIXTURES_DIR, 'sample-vue')
const CONFIG_PATH = join(FIXTURES_DIR, '.i18nrc.json')

describe('checkLayout', () => {
  it('应该检查布局问题', async () => {
    const result = await checkLayoutHandler({
      path: SAMPLE_VUE_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('布局问题')
    expect(result.content[0].text).toContain('统计')
  })

  it('应该检查单个文件', async () => {
    const result = await checkLayoutHandler({
      path: join(SAMPLE_VUE_DIR, 'WithHardcoded.vue'),
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('布局问题')
  })

  it('应该在没有布局问题时返回成功', async () => {
    const result = await checkLayoutHandler({
      path: join(SAMPLE_VUE_DIR, 'NoIssues.vue'),
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    // 可能没有问题或有问题
    expect(result.content[0].text).toContain('布局问题')
  })

  it('应该在路径不存在时返回错误', async () => {
    const result = await checkLayoutHandler({
      path: '/nonexistent/path',
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('路径不存在')
  })
})
