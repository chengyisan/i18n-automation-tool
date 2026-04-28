import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { discoverFiles } from '../utils/fileDiscovery.js'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const TEST_DIR = join(process.cwd(), '.test-cli-discovery')

describe('discoverFiles', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src', 'components'), { recursive: true })
    mkdirSync(join(TEST_DIR, 'node_modules', 'pkg'), { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('应该发现匹配的文件', async () => {
    writeFileSync(join(TEST_DIR, 'src', 'App.vue'), '<template></template>')
    writeFileSync(join(TEST_DIR, 'src', 'main.ts'), 'console.log(1)')
    writeFileSync(join(TEST_DIR, 'src', 'components', 'Btn.vue'), '<template></template>')

    const files = await discoverFiles(TEST_DIR)

    expect(files.length).toBe(3)
    expect(files.some(f => f.endsWith('App.vue'))).toBe(true)
    expect(files.some(f => f.endsWith('main.ts'))).toBe(true)
    expect(files.some(f => f.endsWith('Btn.vue'))).toBe(true)
  })

  it('应该排除 node_modules', async () => {
    writeFileSync(join(TEST_DIR, 'src', 'App.vue'), '<template></template>')
    writeFileSync(join(TEST_DIR, 'node_modules', 'pkg', 'index.js'), 'module.exports = {}')

    const files = await discoverFiles(TEST_DIR)

    expect(files.every(f => !f.includes('node_modules'))).toBe(true)
  })

  it('应该支持自定义 include 模式', async () => {
    writeFileSync(join(TEST_DIR, 'src', 'App.vue'), '<template></template>')
    writeFileSync(join(TEST_DIR, 'src', 'main.ts'), 'console.log(1)')
    writeFileSync(join(TEST_DIR, 'src', 'components', 'Btn.vue'), '<template></template>')

    const files = await discoverFiles(TEST_DIR, ['**/*.vue'])

    expect(files.length).toBe(2) // App.vue + Btn.vue
    expect(files.every(f => f.endsWith('.vue'))).toBe(true)
  })

  it('应该去重', async () => {
    writeFileSync(join(TEST_DIR, 'src', 'App.vue'), '<template></template>')

    // 两个模式都能匹配同一个文件
    const files = await discoverFiles(TEST_DIR, ['**/*.vue', 'src/**/*.vue'])

    const uniqueFiles = [...new Set(files)]
    expect(files.length).toBe(uniqueFiles.length)
  })

  it('应该返回空数组当没有匹配文件时', async () => {
    const files = await discoverFiles(TEST_DIR, ['**/*.py'])

    expect(files).toEqual([])
  })
})
