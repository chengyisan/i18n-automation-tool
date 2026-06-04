import { describe, it, expect } from 'vitest'
import { FragmentedTranslationChecker } from '../checker/fragmentedTranslationChecker'

describe('FragmentedTranslationChecker', () => {
  const checker = new FragmentedTranslationChecker()

  describe('Template 检测', () => {
    it('应该检测 template 中的碎片化翻译拼接', () => {
      const source = `<template>
  <div>{{ t('prefix') }} {{ count }} {{ t('suffix') }}</div>
</template>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(1)
      expect(issues[0].type).toBe('fragmented-translation')
      expect(issues[0].suggestion).toContain('插值变量')
      expect(issues[0].code).toContain("t('prefix')")
      expect(issues[0].code).toContain("t('suffix')")
    })

    it('应该检测 $t() 的碎片化拼接', () => {
      const source = `<template>
  <div>{{ $t('a') }}{{ userName }}{{ $t('b') }}</div>
</template>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(1)
      expect(issues[0].type).toBe('fragmented-translation')
    })

    it('应该检测无变量的纯 t() 拼接', () => {
      const source = `<template>
  <div>{{ t('part1') }}{{ t('part2') }}</div>
</template>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(1)
    })

    it('不应误报有文本分隔符的情况', () => {
      const source = `<template>
  <div>{{ t('title') }} - {{ t('subtitle') }}</div>
</template>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(0)
    })

    it('不应误报单个 t() 调用', () => {
      const source = `<template>
  <div>{{ t('common.title') }}</div>
  <p>{{ count }}</p>
</template>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(0)
    })
  })

  describe('Script 检测', () => {
    it('应该检测 script 中的碎片化翻译拼接', () => {
      const source = `<template>
  <div>测试</div>
</template>

<script setup lang="ts">
const message = t('prefix') + userName + t('suffix')
</script>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(1)
      expect(issues[0].type).toBe('fragmented-translation')
      expect(issues[0].code).toContain("t('prefix')")
      expect(issues[0].code).toContain("t('suffix')")
    })

    it('应该检测纯字符串拼接的碎片化翻译', () => {
      const source = `<script setup>
const msg = t('a') + ' ' + t('b')
</script>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(1)
    })

    it('应该检测 $t() 的拼接', () => {
      const source = `<script>
export default {
  computed: {
    title() {
      return $t('hello') + this.name + $t('world')
    }
  }
}
</script>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(1)
    })

    it('不应误报正确的插值变量模式', () => {
      const source = `<script setup>
const message = t('greeting', { name: userName })
const title = t('pageTitle', { count: total })
</script>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(0)
    })

    it('不应误报单个 t() 调用', () => {
      const source = `<script setup>
const title = t('common.title')
const greeting = 'Hello' + userName
</script>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(0)
    })

    it('应该检测复杂的多重拼接', () => {
      const source = `<script setup>
const msg = t('start') + userName + t('middle') + count + t('end')
</script>`

      const issues = checker.check(source, 'test.vue')

      // 这里可能检测到 1 个问题（整个表达式）
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0].type).toBe('fragmented-translation')
    })
  })

  describe('边界情况', () => {
    it('无 script 块时应返回空数组', () => {
      const source = `<template>
  <div>{{ t('title') }}</div>
</template>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(0)
    })

    it('无 template 块时应正常检测 script', () => {
      const source = `<script setup>
const msg = t('a') + t('b')
</script>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(1)
    })

    it('同时检测 template 和 script 中的问题', () => {
      const source = `<template>
  <div>{{ t('a') }}{{ t('b') }}</div>
</template>

<script setup>
const msg = t('c') + t('d')
</script>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(2)
    })

    it('应该正确计算行号', () => {
      const source = `<template>
  <div>标题</div>
  <p>{{ t('a') }} {{ t('b') }}</p>
</template>`

      const issues = checker.check(source, 'test.vue')

      expect(issues).toHaveLength(1)
      expect(issues[0].line).toBe(3)
    })
  })
})
