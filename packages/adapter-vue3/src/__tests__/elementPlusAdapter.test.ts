import { describe, it, expect } from 'vitest'
import { ElementPlusAdapter } from '../ui-lib/elementPlusAdapter'

describe('ElementPlusAdapter', () => {
  const adapter = new ElementPlusAdapter()

  it('应该检测缺少 ElConfigProvider', () => {
    const source = `<template>
  <ElButton>确认</ElButton>
</template>`

    const issues = adapter.check(source, 'test.vue')

    expect(issues.some((issue) => issue.type === 'missing-config-provider')).toBe(true)
  })

  it('应该检测缺少 locale 导入', () => {
    const source = `<template>
  <ElConfigProvider :locale="locale">
    <ElButton>{{ t('common.confirm') }}</ElButton>
  </ElConfigProvider>
</template>

<script setup>
import { ElConfigProvider } from 'element-plus'
</script>`

    const issues = adapter.check(source, 'test.vue')

    expect(issues.some((issue) => issue.type === 'missing-locale-import')).toBe(true)
  })

  it('应该检测 placeholder 中的硬编码中文', () => {
    const source = `<template>
  <ElInput placeholder="请输入姓名" />
</template>`

    const issues = adapter.check(source, 'test.vue')

    expect(issues.some((issue) => issue.type === 'hardcoded-prop')).toBe(true)
    expect(issues.some((issue) => issue.message.includes('placeholder'))).toBe(true)
  })

  it('应该检测按钮文本中的硬编码中文', () => {
    const source = `<template>
  <ElButton>保存</ElButton>
</template>`

    const issues = adapter.check(source, 'test.vue')

    expect(issues.some((issue) => issue.type === 'hardcoded-prop')).toBe(true)
    expect(issues.some((issue) => issue.message.includes('保存'))).toBe(true)
  })

  it('不应误报已使用 t() 的属性', () => {
    const source = `<template>
  <ElInput :placeholder="t('common.pleaseInput')" />
</template>`

    const issues = adapter.check(source, 'test.vue')

    expect(issues.some((issue) => issue.type === 'hardcoded-prop')).toBe(false)
  })

  it('不应误报非 Element Plus 组件', () => {
    const source = `<template>
  <MyButton placeholder="中文">测试</MyButton>
</template>`

    const issues = adapter.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该支持 kebab-case 组件名', () => {
    const source = `<template>
  <el-input placeholder="请输入" />
</template>`

    const issues = adapter.check(source, 'test.vue')

    expect(issues.some((issue) => issue.type === 'hardcoded-prop')).toBe(true)
  })
})
