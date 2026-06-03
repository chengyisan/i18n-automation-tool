import { describe, it, expect } from 'vitest'
import { handler as checkReactiveHandler } from '../../tools/checkReactive.js'
import { join } from 'path'

const FIXTURES_DIR = join(__dirname, '../fixtures')
const SAMPLE_VUE_DIR = join(FIXTURES_DIR, 'sample-vue')
const CONFIG_PATH = join(FIXTURES_DIR, '.i18nrc.json')

describe('checkReactive', () => {
  it('应该检测出响应式问题', async () => {
    const result = await checkReactiveHandler({
      path: join(SAMPLE_VUE_DIR, 'ReactiveIssue.vue'),
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('响应式问题')
  })

  it('应该在没有响应式问题的文件中返回成功', async () => {
    const result = await checkReactiveHandler({
      path: join(SAMPLE_VUE_DIR, 'NoIssues.vue'),
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('✅ 未发现响应式问题')
  })

  it('应该扫描整个目录', async () => {
    const result = await checkReactiveHandler({
      path: SAMPLE_VUE_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('统计')
  })

  it('应该在路径不存在时返回错误', async () => {
    const result = await checkReactiveHandler({
      path: '/nonexistent/path',
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('路径不存在')
  })

  it('应该拒绝非 Vue 文件', async () => {
    const result = await checkReactiveHandler({
      path: join(FIXTURES_DIR, '.i18nrc.json'),
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('不是 Vue 文件')
  })
})
