import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
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

// mock console 输出
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

const TEST_DIR = join(process.cwd(), '.test-cli-scan')

describe('scanCommand', () => {
  let scanCommand: typeof import('../commands/scan.js').scanCommand

  beforeEach(async () => {
    mockExit.mockClear()
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true })

    // 动态导入，确保 mock 生效
    const mod = await import('../commands/scan.js')
    scanCommand = mod.scanCommand
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('应该扫描包含中文的文件', async () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'test.vue'),
      `<template><div>你好世界</div></template>`
    )

    await scanCommand(TEST_DIR, { json: true })

    // 应该正常执行并调用 process.exit
    expect(mockExit).toHaveBeenCalled()
  })

  it('应该在没有问题时退出码为 0', async () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'test.ts'),
      `const x = 1 + 2`
    )

    await scanCommand(TEST_DIR, {})

    expect(mockExit).toHaveBeenCalledWith(0)
  })

  it('应该在发现问题时退出码为 1', async () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'test.vue'),
      `<template><div>请输入用户名</div></template>`
    )

    await scanCommand(TEST_DIR, {})

    expect(mockExit).toHaveBeenCalledWith(1)
  })
})
