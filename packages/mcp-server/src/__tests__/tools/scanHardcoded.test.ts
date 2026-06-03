import { describe, it, expect } from 'vitest'
import { handler as scanHandler } from '../../tools/scanHardcoded.js'
import { join } from 'path'

const FIXTURES_DIR = join(__dirname, '../fixtures')
const SAMPLE_VUE_DIR = join(FIXTURES_DIR, 'sample-vue')
const CONFIG_PATH = join(FIXTURES_DIR, '.i18nrc.json')

describe('scanHardcoded', () => {
  it('应该扫描出硬编码中文', async () => {
    const result = await scanHandler({
      path: join(SAMPLE_VUE_DIR, 'WithHardcoded.vue'),
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('硬编码中文')
    expect(result.content[0].text).toContain('欢迎使用国际化工具')
  })

  it('应该在没有问题的文件中返回成功', async () => {
    const result = await scanHandler({
      path: join(SAMPLE_VUE_DIR, 'NoIssues.vue'),
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('✅ 未发现问题')
  })

  it('应该扫描整个目录', async () => {
    const result = await scanHandler({
      path: SAMPLE_VUE_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    // 应该包含统计信息
    expect(result.content[0].text).toContain('统计')
  })

  it('应该在路径不存在时返回错误', async () => {
    const result = await scanHandler({
      path: '/nonexistent/path',
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('路径不存在')
  })

  it('应该支持 includeComments 选项', async () => {
    const result = await scanHandler({
      path: join(SAMPLE_VUE_DIR, 'WithHardcoded.vue'),
      configPath: CONFIG_PATH,
      includeComments: true,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
  })
})

