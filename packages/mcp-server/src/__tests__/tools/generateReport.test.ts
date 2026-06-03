import { describe, it, expect } from 'vitest'
import { handler as generateReportHandler } from '../../tools/generateReport.js'
import { join } from 'path'

const FIXTURES_DIR = join(__dirname, '../fixtures')
const SAMPLE_VUE_DIR = join(FIXTURES_DIR, 'sample-vue')
const CONFIG_PATH = join(FIXTURES_DIR, '.i18nrc.json')

describe('generateReport', () => {
  it('应该生成覆盖率报告', async () => {
    const result = await generateReportHandler({
      path: SAMPLE_VUE_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('覆盖率报告')
    expect(result.content[0].text).toContain('总体统计')
    expect(result.content[0].text).toContain('Key 完整性')
  })

  it('应该包含文件详情', async () => {
    const result = await generateReportHandler({
      path: SAMPLE_VUE_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content[0].text).toContain('文件详情')
  })

  it('应该在路径不存在时返回错误', async () => {
    const result = await generateReportHandler({
      path: '/nonexistent/path',
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('路径不存在')
  })
})
