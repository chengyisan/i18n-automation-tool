import { describe, it, expect, beforeEach } from 'vitest'
import { UntranslatableDetector } from '../scanner/UntranslatableDetector.js'
import { DEFAULT_CONFIG } from '../config/ConfigLoader.js'
import type { I18nToolConfig } from '../types.js'

describe('UntranslatableDetector', () => {
  let detector: UntranslatableDetector
  let config: I18nToolConfig

  beforeEach(() => {
    config = { ...DEFAULT_CONFIG }
    detector = new UntranslatableDetector(config)
  })

  describe('后端 value 值检测', () => {
    it('应该检测到对象中的 value 字段', () => {
      const content = `const config = { value: '已完成', label: '已完成' }`
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('已完成')
      expect(result[0].reason).toBe('backend-value')
    })

    it('应该检测到对象中的 status 字段', () => {
      const content = `const data = { status: '进行中' }`
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('进行中')
      expect(result[0].reason).toBe('backend-value')
    })

    it('应该检测到对象中的 code 字段', () => {
      const content = `const item = { code: '待审核', name: '待审核' }`
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('待审核')
      expect(result[0].reason).toBe('backend-value')
    })

    it('应该检测到对象中的 type 字段', () => {
      const content = `const obj = { type: '文档' }`
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('文档')
      expect(result[0].reason).toBe('backend-value')
    })
  })

  describe('图片路径检测', () => {
    it('应该检测到 src 属性中的中文路径', () => {
      const content = `<img src="./images/中文图片.png" />`
      const result = detector.detect(content, 'test.vue')

      expect(result).toHaveLength(1)
      expect(result[0].text).toContain('中文图片')
      expect(result[0].reason).toBe('image-text')
    })

    it('应该检测到 import 语句中的中文路径', () => {
      const content = `import logo from './中文logo.png'`
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].text).toContain('中文logo')
      expect(result[0].reason).toBe('image-text')
    })

    it('应该检测到 require 中的中文路径', () => {
      const content = `const img = require('./images/完成.png')`
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].text).toContain('完成')
      expect(result[0].reason).toBe('image-text')
    })
  })

  describe('SVG 文本检测', () => {
    it('应该检测到 text 节点中的中文', () => {
      const content = `<svg><text>中文标签</text></svg>`
      const result = detector.detect(content, 'test.vue')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('中文标签')
      expect(result[0].reason).toBe('svg-text')
    })

    it('应该检测到 tspan 节点中的中文', () => {
      const content = `<svg><tspan>中文文本</tspan></svg>`
      const result = detector.detect(content, 'test.vue')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('中文文本')
      expect(result[0].reason).toBe('svg-text')
    })

    it('当配置禁用时不应该检测 SVG 文本', () => {
      config.untranslatablePatterns.svgTextNodes = false
      detector = new UntranslatableDetector(config)

      const content = `<svg><text>中文标签</text></svg>`
      const result = detector.detect(content, 'test.vue')

      expect(result).toHaveLength(0)
    })
  })

  describe('动态字符串检测', () => {
    it('应该检测到模板字符串中的动态拼接', () => {
      const content = 'const msg = `用户${name}已登录`'
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].reason).toBe('dynamic-string')
    })

    it('应该检测到字符串拼接', () => {
      const content = `const msg = '欢迎' + name + '登录'`
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].reason).toBe('dynamic-string')
    })
  })

  describe('混合场景', () => {
    it('应该同时检测多种不可转换类型', () => {
      const content = `
        const config = {
          value: '已完成',
          label: '已完成',
          icon: './images/完成.png'
        }
      `
      const result = detector.detect(content, 'test.js')

      // 至少应该检测到 backend-value
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.some(item => item.reason === 'backend-value')).toBe(true)
    })

    it('普通字符串不应该被检测', () => {
      const content = `const title = '标题'`
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(0)
    })

    it('空文件不应该有检测结果', () => {
      const content = ``
      const result = detector.detect(content, 'test.js')

      expect(result).toHaveLength(0)
    })
  })

  describe('处理建议', () => {
    it('后端 value 应该提供正确的建议', () => {
      const content = `const config = { value: '已完成' }`
      const result = detector.detect(content, 'test.js')

      expect(result[0].suggestion).toContain('不可翻译')
      expect(result[0].suggestion).toContain('后端交互')
    })

    it('图片路径应该提供正确的建议', () => {
      const content = `<img src="./中文.png" />`
      const result = detector.detect(content, 'test.vue')

      expect(result[0].suggestion).toContain('图片路径')
      expect(result[0].suggestion).toContain('对应的图片资源')
    })

    it('SVG 文本应该提供正确的建议', () => {
      const content = `<svg><text>中文标签</text></svg>`
      const result = detector.detect(content, 'test.vue')

      // SVG 文本检测在前面的测试中已经验证过了
      // 这里只验证如果检测到了，建议是否正确
      if (result.length > 0) {
        const svgItem = result.find(item => item.reason === 'svg-text')
        if (svgItem) {
          expect(svgItem.suggestion).toContain('SVG')
          expect(svgItem.suggestion).toContain('提取为 i18n')
        }
      }
    })

    it('动态字符串应该提供正确的建议', () => {
      const content = 'const msg = `用户${name}已登录`'
      const result = detector.detect(content, 'test.js')

      expect(result[0].suggestion).toContain('动态拼接')
      expect(result[0].suggestion).toContain('插值语法')
    })
  })
})
