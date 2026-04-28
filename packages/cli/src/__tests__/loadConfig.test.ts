import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig } from '../utils/loadConfig.js'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const TEST_DIR = join(process.cwd(), '.test-cli-config')

describe('loadConfig', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('应该返回默认配置当配置文件不存在时', () => {
    const config = loadConfig(join(TEST_DIR, '.i18nrc.json'))

    expect(config.locales).toEqual(['zh-CN', 'en-US'])
    expect(config.defaultLocale).toBe('zh-CN')
    expect(config.langDir).toBe('locales')
  })

  it('应该加载并合并用户配置', () => {
    const configPath = join(TEST_DIR, '.i18nrc.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        locales: ['zh-CN', 'en-US', 'ja-JP'],
        defaultLocale: 'zh-CN',
        langDir: 'lang',
      })
    )

    const config = loadConfig(configPath)

    expect(config.locales).toEqual(['zh-CN', 'en-US', 'ja-JP'])
    expect(config.langDir).toBe('lang')
    // 默认配置应该被保留
    expect(config.translationService).toBe('local')
  })

  it('应该支持自定义配置文件路径', () => {
    const customPath = join(TEST_DIR, 'custom.json')
    writeFileSync(
      customPath,
      JSON.stringify({
        locales: ['zh-CN'],
        defaultLocale: 'zh-CN',
        langDir: 'i18n',
      })
    )

    const config = loadConfig(customPath)

    expect(config.langDir).toBe('i18n')
  })

  it('应该处理无效的 JSON 文件', () => {
    const configPath = join(TEST_DIR, '.i18nrc.json')
    writeFileSync(configPath, 'invalid json{')

    const config = loadConfig(configPath)

    // 应该返回默认配置
    expect(config.locales).toEqual(['zh-CN', 'en-US'])
  })
})
