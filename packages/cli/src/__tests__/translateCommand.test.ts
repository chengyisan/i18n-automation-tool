import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

// mock process.exit 避免测试进程退出
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

// mock spinner 避免终端输出
vi.mock('../utils/spinner.js', () => ({
  spinner: {
    start: () => ({
      succeed: () => {},
      fail: () => {},
      set text(_: string) {},
    }),
  },
}))

// mock ApiTranslator 避免实际调用翻译 API
vi.mock('@i18n-tool/core', async () => {
  const actual = await vi.importActual('@i18n-tool/core')
  return {
    ...actual,
    ApiTranslator: class MockApiTranslator {
      async translateBatch(texts: string[]) {
        return texts.map((text) => ({
          sourceText: text,
          translatedText: `[EN] ${text}`,
          sourceLang: 'zh-CN',
          targetLang: 'en-US',
          fromCache: false,
        }))
      }
    },
    CacheManager: class MockCacheManager {
      close() {}
    },
  }
})

// mock console 输出
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

const TEST_DIR = join(process.cwd(), '.test-cli-translate')

describe('translateCommand', () => {
  let translateCommand: typeof import('../commands/translate.js').translateCommand

  beforeEach(async () => {
    mockExit.mockClear()
    mkdirSync(join(TEST_DIR, 'src', 'locales'), { recursive: true })

    // 创建配置文件
    writeFileSync(
      join(TEST_DIR, '.i18nrc.json'),
      JSON.stringify({
        locales: ['zh-CN', 'en-US', 'ja-JP'],
        defaultLocale: 'zh-CN',
        langDir: 'src/locales',
        translation: {
          provider: 'google',
          apiKey: 'test-api-key',
          retries: 3,
        },
      })
    )

    // 创建基准语言包
    writeFileSync(
      join(TEST_DIR, 'src', 'locales', 'zh-CN.json'),
      JSON.stringify({
        common: {
          hello: '你好',
          world: '世界',
        },
        user: {
          name: '用户名',
          password: '密码',
        },
      }, null, 2)
    )

    // 创建空的目标语言包
    writeFileSync(join(TEST_DIR, 'src', 'locales', 'en-US.json'), '{}')
    writeFileSync(join(TEST_DIR, 'src', 'locales', 'ja-JP.json'), '{}')

    // 动态导入，确保 mock 生效
    const mod = await import('../commands/translate.js')
    translateCommand = mod.translateCommand
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('应该翻译所有目标语言', async () => {
    await translateCommand(TEST_DIR, { config: join(TEST_DIR, '.i18nrc.json') })

    const enContent = readFileSync(join(TEST_DIR, 'src', 'locales', 'en-US.json'), 'utf-8')
    const enTranslations = JSON.parse(enContent)

    expect(enTranslations).toHaveProperty('common')
    expect(enTranslations.common).toHaveProperty('hello')
    expect(enTranslations.common.hello).toContain('[EN]')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该只翻译指定语言', async () => {
    await translateCommand(TEST_DIR, { locale: 'en-US', config: join(TEST_DIR, '.i18nrc.json') })

    const enContent = readFileSync(join(TEST_DIR, 'src', 'locales', 'en-US.json'), 'utf-8')
    const jaContent = readFileSync(join(TEST_DIR, 'src', 'locales', 'ja-JP.json'), 'utf-8')

    const enTranslations = JSON.parse(enContent)
    const jaTranslations = JSON.parse(jaContent)

    expect(Object.keys(enTranslations).length).toBeGreaterThan(0)
    expect(Object.keys(jaTranslations).length).toBe(0)
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该在 dry-run 模式下不写入文件', async () => {
    await translateCommand(TEST_DIR, { dryRun: true, config: join(TEST_DIR, '.i18nrc.json') })

    const enContent = readFileSync(join(TEST_DIR, 'src', 'locales', 'en-US.json'), 'utf-8')
    const enTranslations = JSON.parse(enContent)

    expect(Object.keys(enTranslations).length).toBe(0)
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该保留现有翻译，只添加缺失的 key', async () => {
    // 先添加一些现有翻译
    writeFileSync(
      join(TEST_DIR, 'src', 'locales', 'en-US.json'),
      JSON.stringify({
        common: {
          hello: 'Hello (existing)',
        },
      }, null, 2)
    )

    await translateCommand(TEST_DIR, { locale: 'en-US', config: join(TEST_DIR, '.i18nrc.json') })

    const enContent = readFileSync(join(TEST_DIR, 'src', 'locales', 'en-US.json'), 'utf-8')
    const enTranslations = JSON.parse(enContent)

    expect(enTranslations.common.hello).toBe('Hello (existing)')
    expect(enTranslations.common.world).toContain('[EN]')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该正确处理嵌套的语言包结构', async () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'locales', 'zh-CN.json'),
      JSON.stringify({
        level1: {
          level2: {
            level3: '深层嵌套',
          },
        },
      }, null, 2)
    )

    await translateCommand(TEST_DIR, { locale: 'en-US', config: join(TEST_DIR, '.i18nrc.json') })

    const enContent = readFileSync(join(TEST_DIR, 'src', 'locales', 'en-US.json'), 'utf-8')
    const enTranslations = JSON.parse(enContent)

    expect(enTranslations).toHaveProperty('level1')
    expect(enTranslations.level1).toHaveProperty('level2')
    expect(enTranslations.level1.level2).toHaveProperty('level3')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该在缺少 API Key 时报错', async () => {
    // 创建没有 API Key 的配置
    writeFileSync(
      join(TEST_DIR, '.i18nrc.json'),
      JSON.stringify({
        locales: ['zh-CN', 'en-US'],
        defaultLocale: 'zh-CN',
        langDir: 'src/locales',
        translation: {
          provider: 'google',
        },
      })
    )

    await translateCommand(TEST_DIR, { config: join(TEST_DIR, '.i18nrc.json') })

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('应该在基准语言包不存在时报错', async () => {
    rmSync(join(TEST_DIR, 'src', 'locales', 'zh-CN.json'))

    await translateCommand(TEST_DIR, { config: join(TEST_DIR, '.i18nrc.json') })

    expect(mockExit).toHaveBeenCalledWith(1)
  })
})
