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

const TEST_DIR = join(process.cwd(), '.test-cli-quality')

describe('checkQualityCommand', () => {
  let checkQualityCommand: typeof import('../commands/checkQuality.js').checkQualityCommand

  beforeEach(async () => {
    mockExit.mockClear()
    mkdirSync(join(TEST_DIR, 'locales'), { recursive: true })

    const mod = await import('../commands/checkQuality.js')
    checkQualityCommand = mod.checkQualityCommand
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('应该检查翻译质量', async () => {
    writeFileSync(
      join(TEST_DIR, '.i18nrc.json'),
      JSON.stringify({
        locales: ['zh-CN', 'en-US'],
        defaultLocale: 'zh-CN',
        langDir: 'locales',
      })
    )

    writeFileSync(
      join(TEST_DIR, 'locales', 'en-US.json'),
      JSON.stringify({
        common: {
          greeting: 'Hello',
          farewell: 'Goodbye',
        },
      })
    )

    await checkQualityCommand(TEST_DIR, {
      json: true,
      config: join(TEST_DIR, '.i18nrc.json'),
    })

    expect(mockExit).toHaveBeenCalled()
  })

  it('应该在无质量问题时退出码为 0', async () => {
    writeFileSync(
      join(TEST_DIR, '.i18nrc.json'),
      JSON.stringify({
        locales: ['zh-CN', 'en-US'],
        defaultLocale: 'zh-CN',
        langDir: 'locales',
      })
    )

    writeFileSync(
      join(TEST_DIR, 'locales', 'en-US.json'),
      JSON.stringify({ common: { ok: 'OK' } })
    )

    await checkQualityCommand(TEST_DIR, {
      config: join(TEST_DIR, '.i18nrc.json'),
    })

    expect(mockExit).toHaveBeenCalledWith(0)
  })
})
