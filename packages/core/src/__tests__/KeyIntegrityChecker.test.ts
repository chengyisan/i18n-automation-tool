import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkKeyIntegrity } from '../validator/KeyIntegrityChecker'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'

const TEST_DIR = join(process.cwd(), '.test-locales')

describe('KeyIntegrityChecker', () => {
  beforeEach(() => {
    // 创建测试目录
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    // 清理测试目录
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('应该检测缺失的翻译 key', () => {
    // 准备测试数据
    writeFileSync(
      join(TEST_DIR, 'zh-CN.json'),
      JSON.stringify({
        common: {
          submit: '提交',
          cancel: '取消',
        },
      })
    )

    writeFileSync(
      join(TEST_DIR, 'en-US.json'),
      JSON.stringify({
        common: {
          submit: 'Submit',
          // cancel 缺失
        },
      })
    )

    const result = checkKeyIntegrity(TEST_DIR, ['zh-CN', 'en-US'], 'zh-CN')

    expect(result.totalKeys).toBe(2)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('missing_translation_key')
    expect(result.issues[0].locale).toBe('en-US')
    expect(result.issues[0].key).toBe('common.cancel')
    expect(result.localeStats['en-US'].missing).toBe(1)
  })

  it('应该检测多余的翻译 key', () => {
    writeFileSync(
      join(TEST_DIR, 'zh-CN.json'),
      JSON.stringify({
        common: {
          submit: '提交',
        },
      })
    )

    writeFileSync(
      join(TEST_DIR, 'en-US.json'),
      JSON.stringify({
        common: {
          submit: 'Submit',
          cancel: 'Cancel', // 多余
        },
      })
    )

    const result = checkKeyIntegrity(TEST_DIR, ['zh-CN', 'en-US'], 'zh-CN')

    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('extra_translation_key')
    expect(result.issues[0].locale).toBe('en-US')
    expect(result.issues[0].key).toBe('common.cancel')
    expect(result.localeStats['en-US'].extra).toBe(1)
  })

  it('应该支持嵌套对象', () => {
    writeFileSync(
      join(TEST_DIR, 'zh-CN.json'),
      JSON.stringify({
        user: {
          profile: {
            name: '姓名',
            age: '年龄',
          },
        },
      })
    )

    writeFileSync(
      join(TEST_DIR, 'en-US.json'),
      JSON.stringify({
        user: {
          profile: {
            name: 'Name',
            // age 缺失
          },
        },
      })
    )

    const result = checkKeyIntegrity(TEST_DIR, ['zh-CN', 'en-US'], 'zh-CN')

    expect(result.totalKeys).toBe(2)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].key).toBe('user.profile.age')
  })

  it('应该处理多个语言', () => {
    writeFileSync(
      join(TEST_DIR, 'zh-CN.json'),
      JSON.stringify({
        common: {
          submit: '提交',
          cancel: '取消',
        },
      })
    )

    writeFileSync(
      join(TEST_DIR, 'en-US.json'),
      JSON.stringify({
        common: {
          submit: 'Submit',
          // cancel 缺失
        },
      })
    )

    writeFileSync(
      join(TEST_DIR, 'es-ES.json'),
      JSON.stringify({
        common: {
          submit: 'Enviar',
          cancel: 'Cancelar',
          delete: 'Eliminar', // 多余
        },
      })
    )

    const result = checkKeyIntegrity(TEST_DIR, ['zh-CN', 'en-US', 'es-ES'], 'zh-CN')

    expect(result.issues).toHaveLength(2)
    expect(result.localeStats['en-US'].missing).toBe(1)
    expect(result.localeStats['es-ES'].extra).toBe(1)
  })

  it('应该处理完全匹配的情况', () => {
    writeFileSync(
      join(TEST_DIR, 'zh-CN.json'),
      JSON.stringify({
        common: {
          submit: '提交',
        },
      })
    )

    writeFileSync(
      join(TEST_DIR, 'en-US.json'),
      JSON.stringify({
        common: {
          submit: 'Submit',
        },
      })
    )

    const result = checkKeyIntegrity(TEST_DIR, ['zh-CN', 'en-US'], 'zh-CN')

    expect(result.issues).toHaveLength(0)
    expect(result.localeStats['en-US'].missing).toBe(0)
    expect(result.localeStats['en-US'].extra).toBe(0)
  })

  it('应该处理语言包文件不存在的情况', () => {
    writeFileSync(
      join(TEST_DIR, 'zh-CN.json'),
      JSON.stringify({
        common: {
          submit: '提交',
        },
      })
    )

    const result = checkKeyIntegrity(TEST_DIR, ['zh-CN', 'en-US'], 'zh-CN')

    expect(result.totalKeys).toBe(1)
    expect(result.issues).toHaveLength(0)
    expect(result.localeStats['en-US']).toBeUndefined()
  })

  it('应该处理基准语言不存在的情况', () => {
    const result = checkKeyIntegrity(TEST_DIR, ['zh-CN', 'en-US'], 'zh-CN')

    expect(result.totalKeys).toBe(0)
    expect(result.issues).toHaveLength(0)
  })
})
