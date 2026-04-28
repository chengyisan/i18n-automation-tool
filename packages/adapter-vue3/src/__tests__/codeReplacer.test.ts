import { describe, it, expect } from 'vitest'
import { CodeReplacer } from '../replacer/codeReplacer'

describe('CodeReplacer', () => {
  const replacer = new CodeReplacer()

  it('应该替换 template 中的纯文本', () => {
    const source = `<template>
  <div>确认删除</div>
</template>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.replacements).toHaveLength(1)
    expect(result.replacements[0].original).toBe('确认删除')
    expect(result.replacements[0].context).toBe('template')
    expect(result.modifiedContent).toContain('{{ t(')
  })

  it('应该替换 template 中的属性值', () => {
    const source = `<template>
  <input placeholder="请输入姓名" />
</template>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.replacements).toHaveLength(1)
    expect(result.replacements[0].original).toBe('请输入姓名')
    expect(result.replacements[0].context).toBe('template')
    expect(result.modifiedContent).toContain(':placeholder="t(')
  })

  it('应该替换 script 中的字符串字面量', () => {
    const source = `<script setup>
const message = '操作成功'
</script>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.replacements).toHaveLength(1)
    expect(result.replacements[0].original).toContain('操作成功')
    expect(result.replacements[0].context).toBe('script')
    expect(result.modifiedContent).toContain("t('test.text1')")
  })

  it('应该自动添加 useI18n 导入', () => {
    const source = `<script setup>
const message = '测试'
</script>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.addedImports).toContain("import { useI18n } from 'vue-i18n'")
    expect(result.addedImports).toContain('const { t } = useI18n()')
    expect(result.modifiedContent).toContain("import { useI18n } from 'vue-i18n'")
    expect(result.modifiedContent).toContain('const { t } = useI18n()')
  })

  it('已有 useI18n 时不应重复添加', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const message = '测试'
</script>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.addedImports).toHaveLength(0)
    const importCount = (result.modifiedContent.match(/import.*useI18n/g) || []).length
    expect(importCount).toBe(1)
  })

  it('无中文时应返回空替换列表', () => {
    const source = `<template>
  <div>Hello</div>
</template>

<script setup>
const count = 0
</script>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.replacements).toHaveLength(0)
    expect(result.modifiedContent).toBe(source)
  })

  it('应该生成语义化的 key', () => {
    const source = `<script setup>
const msg1 = '第一条'
const msg2 = '第二条'
</script>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.replacements).toHaveLength(2)
    expect(result.replacements[0].key).toBe('test.text1')
    expect(result.replacements[1].key).toBe('test.text2')
  })

  it('应该支持自定义 keyPrefix', () => {
    const source = `<script setup>
const msg = '测试'
</script>`

    const result = replacer.replace(source, 'test.vue', 'custom')

    expect(result.replacements[0].key).toBe('custom.text1')
  })

  it('不应替换已有 t() 的文本', () => {
    const source = `<template>
  <div>{{ t('common.title') }}</div>
</template>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.replacements).toHaveLength(0)
  })

  it('不应替换 import 语句中的字符串', () => {
    const source = `<script setup>
import { 测试 } from './测试模块'
</script>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.replacements).toHaveLength(0)
  })

  it('混合 template 和 script 替换', () => {
    const source = `<template>
  <div>标题</div>
</template>

<script setup>
const message = '内容'
</script>`

    const result = replacer.replace(source, 'test.vue')

    expect(result.replacements).toHaveLength(2)
    expect(result.replacements.some((r) => r.context === 'template')).toBe(true)
    expect(result.replacements.some((r) => r.context === 'script')).toBe(true)
  })
})
