import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

vi.mock('../utils/spinner.js', () => ({
  spinner: {
    start: () => ({
      succeed: () => {},
      fail: () => {},
      set text(_: string) {},
    }),
  },
}))

vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

const TEST_DIR = join(process.cwd(), '.test-cli-validate')

describe('validateCommand', () => {
  let validateCommand: typeof import('../commands/validate.js').validateCommand

  beforeEach(async () => {
    mockExit.mockClear()
    mkdirSync(join(TEST_DIR, 'locales'), { recursive: true })

    const mod = await import('../commands/validate.js')
    validateCommand = mod.validateCommand
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('应该验证配置并检查 key 完整性', async () => {
    // 创建配置文件
    writeFileSync(
      join(TEST_DIR, '.i18nrc.json'),
      JSON.stringify({
        locales: ['zh-CN', 'en-US'],
        defaultLocale: 'zh-CN',
        langDir: 'locales',
      })
    )

    // 创建语言包
    writeFileSync(
      join(TEST_DIR, 'locales', 'zh-CN.json'),
      JSON.stringify({ common: { submit: '提交', cancel: '取消' } })
    )
    writeFileSync(
      join(TEST_DIR, 'locales', 'en-US.json'),
      JSON.stringify({ common: { submit: 'Submit' } })
    )

    await validateCommand(TEST_DIR, {
      json: true,
      config: join(TEST_DIR, '.i18nrc.json'),
    })

    expect(mockExit).toHaveBeenCalled()
  })

  it('应该在完全匹配时退出码为 0', async () => {
    writeFileSync(
      join(TEST_DIR, '.i18nrc.json'),
      JSON.stringify({
        locales: ['zh-CN', 'en-US'],
        defaultLocale: 'zh-CN',
        langDir: 'locales',
      })
    )

    writeFileSync(
      join(TEST_DIR, 'locales', 'zh-CN.json'),
      JSON.stringify({ common: { submit: '提交' } })
    )
    writeFileSync(
      join(TEST_DIR, 'locales', 'en-US.json'),
      JSON.stringify({ common: { submit: 'Submit' } })
    )

    await validateCommand(TEST_DIR, {
      config: join(TEST_DIR, '.i18nrc.json'),
    })

    expect(mockExit).toHaveBeenCalledWith(0)
  })
})
