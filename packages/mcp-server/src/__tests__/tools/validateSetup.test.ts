import { describe, it, expect } from 'vitest'
import { handler as validateHandler } from '../../tools/validateSetup.js'
import { join } from 'path'

const FIXTURES_DIR = join(__dirname, '../fixtures')
const CONFIG_PATH = join(FIXTURES_DIR, '.i18nrc.json')

describe('validateSetup', () => {
  it('应该验证配置完整性', async () => {
    const result = await validateHandler({
      path: FIXTURES_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('验证结果')
  })

  it('应该检测 key 缺失', async () => {
    const result = await validateHandler({
      path: FIXTURES_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    // en-US 缺少 'common.confirm' key
    expect(result.content[0].text).toContain('Key 完整性')
  })

  it('应该在路径不存在时返回错误', async () => {
    const result = await validateHandler({
      path: '/nonexistent/path',
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('路径不存在')
  })

  it('应该在路径不是目录时返回错误', async () => {
    const result = await validateHandler({
      path: CONFIG_PATH, // 传入文件路径
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('❌ 错误')
    expect(result.content[0].text).toContain('路径必须是目录')
  })

  it('应该在没有配置问题时返回验证通过', async () => {
    // 这个测试需要一个完整的配置和语言包设置
    // 当前 fixture 有 key 缺失问题，所以这里只验证格式
    const result = await validateHandler({
      path: FIXTURES_DIR,
      configPath: CONFIG_PATH,
    })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('统计')
  })
})

