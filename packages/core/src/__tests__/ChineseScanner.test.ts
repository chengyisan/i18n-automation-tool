import { describe, it, expect, beforeEach } from 'vitest'
import { ChineseScanner } from '../scanner/ChineseScanner.js'
import { DEFAULT_CONFIG } from '../config/ConfigLoader.js'
import type { I18nToolConfig } from '../types.js'

describe('ChineseScanner', () => {
  let scanner: ChineseScanner
  let config: I18nToolConfig

  beforeEach(() => {
    config = { ...DEFAULT_CONFIG }
    scanner = new ChineseScanner(config)
  })

  describe('基本中文检测', () => {
    it('应该检测到单引号字符串中的中文', () => {
      const content = `const title = '标题'`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].text).toBe('标题')
      expect(result.hardcodedStrings[0].context).toBe('script')
    })

    it('应该检测到双引号字符串中的中文', () => {
      const content = `const msg = "操作成功"`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].text).toBe('操作成功')
    })

    it('应该检测到模板字符串中的中文', () => {
      const content = `const msg = \`欢迎使用\``
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].text).toBe('欢迎使用')
    })
  })

  describe('排除规则', () => {
    it('应该排除单行注释中的中文', () => {
      const content = `// 这是注释\nconst x = "这是字符串"`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].text).toBe('这是字符串')
    })

    it('应该排除多行注释中的中文', () => {
      const content = `/* 这是多行注释 */\nconst x = "这是字符串"`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].text).toBe('这是字符串')
    })

    it('应该排除 HTML 注释中的中文', () => {
      const content = `<!-- 这是 HTML 注释 -->\n<span>这是文本</span>`
      const result = scanner.scanContent({
        content,
        filePath: 'test.vue',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].text).toBe('这是文本')
    })

    it('应该排除 URL 中的中文', () => {
      const content = `const url = "https://example.com/中文路径"`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(0)
    })

    it('应该排除 t() 调用', () => {
      const content = `const title = t('common.title')`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(0)
    })

    it('应该排除 $t() 调用', () => {
      const content = `{{ $t('common.title') }}`
      const result = scanner.scanContent({
        content,
        filePath: 'test.vue',
      })

      expect(result.hardcodedStrings).toHaveLength(0)
    })

    it('应该排除 console 语句', () => {
      const content = `console.log('调试信息')`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(0)
    })

    it('应该排除 import 语句', () => {
      const content = `import { ref } from 'vue'`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(0)
    })
  })

  describe('位置计算', () => {
    it('应该正确计算行号和列号', () => {
      const content = `const a = 1\nconst title = '标题'\nconst b = 2`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].line).toBe(2)
      expect(result.hardcodedStrings[0].column).toBeGreaterThan(0)
    })
  })

  describe('上下文检测', () => {
    it('应该检测 template 上下文', () => {
      const content = `<template>\n  <span>中文文本</span>\n</template>`
      const result = scanner.scanContent({
        content,
        filePath: 'test.vue',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].context).toBe('template')
    })

    it('应该检测 script 上下文', () => {
      const content = `<script>\nconst title = '标题'\n</script>`
      const result = scanner.scanContent({
        content,
        filePath: 'test.vue',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].context).toBe('script')
    })
  })

  describe('混合场景', () => {
    it('应该处理混合中英文', () => {
      const content = `const msg = "Hello世界World"`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].text).toBe('世界')
    })

    it('应该处理包含中文标点的字符串', () => {
      const content = `const msg = "你好，世界！"`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(1)
      expect(result.hardcodedStrings[0].text).toContain('你好')
    })

    it('应该处理空文件', () => {
      const content = ``
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(0)
    })

    it('应该处理无中文文件', () => {
      const content = `const title = 'Hello World'`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings).toHaveLength(0)
    })
  })

  describe('key 生成', () => {
    it('应该为常见中文生成合理的 key', () => {
      const content = `const msg = "操作成功"`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings[0].suggestedKey).toBe('sucOpt')
    })

    it('应该为"请输入"生成 placeholder_input', () => {
      const content = `const placeholder = "请输入"`
      const result = scanner.scanContent({
        content,
        filePath: 'test.js',
      })

      expect(result.hardcodedStrings[0].suggestedKey).toBe('placeholder_input')
    })
  })
})
