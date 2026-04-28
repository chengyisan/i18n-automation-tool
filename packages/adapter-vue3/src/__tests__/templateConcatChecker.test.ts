import { describe, it, expect } from 'vitest'
import { TemplateConcatChecker } from '../checker/templateConcatChecker'

describe('TemplateConcatChecker', () => {
  const checker = new TemplateConcatChecker()

  it('应该检测相邻的 t() 拼接', () => {
    const source = `<template>
  <div>{{ t('title.part1') }}{{ t('title.part2') }}</div>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('template-concat-missing-space')
    expect(issues[0].suggestion).toContain('localeSep')
  })

  it('应该检测 $t() 拼接', () => {
    const source = `<template>
  <div>{{ $t('title.part1') }}{{ $t('title.part2') }}</div>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
  })

  it('不应误报有文本分隔的表达式', () => {
    const source = `<template>
  <div>{{ t('title.part1') }} - {{ t('title.part2') }}</div>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报单个 t() 表达式', () => {
    const source = `<template>
  <div>{{ t('title') }}</div>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('无 template 时应返回空数组', () => {
    const source = `<script setup>
const msg = 'hello'
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该正确计算行号', () => {
    const source = `<template>
  <div>标题</div>
  <p>{{ t('a') }}{{ t('b') }}</p>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].line).toBe(3)
  })
})
