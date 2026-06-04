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

// mock inquirer 自动确认
vi.mock('inquirer', () => ({
  default: {
    prompt: async () => ({ shouldFix: true }),
  },
}))

// mock console 输出
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

const TEST_DIR = join(process.cwd(), '.test-cli-fix')

describe('fixCommand', () => {
  let fixCommand: typeof import('../commands/fix.js').fixCommand

  beforeEach(async () => {
    mockExit.mockClear()
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true })
    mkdirSync(join(TEST_DIR, 'src', 'locales'), { recursive: true })

    // 创建配置文件
    writeFileSync(
      join(TEST_DIR, '.i18nrc.json'),
      JSON.stringify({
        locales: ['zh-CN', 'en-US'],
        defaultLocale: 'zh-CN',
        langDir: 'src/locales',
        scan: {
          include: ['**/*.vue', '**/*.ts'],
          exclude: ['node_modules/**', 'dist/**'],
        },
      })
    )

    // 创建空语言包
    writeFileSync(join(TEST_DIR, 'src', 'locales', 'zh-CN.json'), '{}')

    // 动态导入，确保 mock 生效
    const mod = await import('../commands/fix.js')
    fixCommand = mod.fixCommand
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('应该替换硬编码中文为 t() 调用', async () => {
    const testFile = join(TEST_DIR, 'src', 'test.vue')
    writeFileSync(
      testFile,
      `<template>
  <div>你好世界</div>
</template>
`
    )

    await fixCommand(TEST_DIR, { auto: true, config: join(TEST_DIR, '.i18nrc.json') })

    const modifiedContent = readFileSync(testFile, 'utf-8')
    expect(modifiedContent).toContain('{{ t(')
    expect(modifiedContent).toContain('useI18n')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该更新语言包 JSON', async () => {
    const testFile = join(TEST_DIR, 'src', 'test.vue')
    writeFileSync(
      testFile,
      `<template>
  <div>请输入用户名</div>
</template>
`
    )

    await fixCommand(TEST_DIR, { auto: true, config: join(TEST_DIR, '.i18nrc.json') })

    const langFilePath = join(TEST_DIR, 'src', 'locales', 'zh-CN.json')
    const langContent = readFileSync(langFilePath, 'utf-8')
    const translations = JSON.parse(langContent)

    // 应该添加了新的翻译 key
    const allKeys = Object.keys(translations)

    // CodeReplacer 会生成类似 test.text1 这样的 key
    expect(allKeys.length).toBeGreaterThan(0)
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该在 dry-run 模式下不写入文件', async () => {
    const testFile = join(TEST_DIR, 'src', 'test.vue')
    const originalContent = `<template>
  <div>你好世界</div>
</template>
`
    writeFileSync(testFile, originalContent)

    await fixCommand(TEST_DIR, { auto: true, dryRun: true, config: join(TEST_DIR, '.i18nrc.json') })

    const contentAfter = readFileSync(testFile, 'utf-8')
    expect(contentAfter).toBe(originalContent)
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该正确处理指定文件', async () => {
    const testFile1 = join(TEST_DIR, 'src', 'test1.vue')
    const testFile2 = join(TEST_DIR, 'src', 'test2.vue')

    writeFileSync(
      testFile1,
      `<template><div>文件1</div></template>`
    )
    writeFileSync(
      testFile2,
      `<template><div>文件2</div></template>`
    )

    await fixCommand(TEST_DIR, { auto: true, file: 'src/test1.vue', config: join(TEST_DIR, '.i18nrc.json') })

    const content1 = readFileSync(testFile1, 'utf-8')
    const content2 = readFileSync(testFile2, 'utf-8')

    expect(content1).toContain('{{ t(')
    expect(content2).not.toContain('{{ t(')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该在没有硬编码时正常退出', async () => {
    const testFile = join(TEST_DIR, 'src', 'test.ts')
    writeFileSync(testFile, `const x = 1 + 2`)

    await fixCommand(TEST_DIR, { auto: true, config: join(TEST_DIR, '.i18nrc.json') })

    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该支持嵌套 key 的语言包合并', async () => {
    const testFile = join(TEST_DIR, 'src', 'userProfile.vue')
    writeFileSync(
      testFile,
      `<template>
  <div>用户名</div>
  <div>密码</div>
</template>
`
    )

    await fixCommand(TEST_DIR, { auto: true, config: join(TEST_DIR, '.i18nrc.json') })

    const langFilePath = join(TEST_DIR, 'src', 'locales', 'zh-CN.json')
    const langContent = readFileSync(langFilePath, 'utf-8')
    const translations = JSON.parse(langContent)

    // 应该生成嵌套结构（如 userProfile.text1）
    expect(translations).toHaveProperty('userProfile')
    expect(mockExit).toHaveBeenCalledWith(0)
  })
})
