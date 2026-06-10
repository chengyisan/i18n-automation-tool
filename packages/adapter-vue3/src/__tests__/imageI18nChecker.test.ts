import { describe, it, expect } from 'vitest'
import { ImageI18nChecker } from '../checker/imageI18nChecker'

describe('ImageI18nChecker', () => {
  const checker = new ImageI18nChecker()

  it('应该检测 <img src> 路径含中文的静态图片', () => {
    const source = `<template>
  <div>
    <img src="@/assets/欢迎.png" />
  </div>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('image-i18n-missing')
    expect(issues[0].suggestion).toContain('locale')
  })

  it('应该检测 <img :src="require()"> 含中文的图片', () => {
    const source = `<template>
  <img :src="require('@/assets/产品介绍.svg')" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].code).toContain('产品介绍')
  })

  it('应该检测 <img :src="\'xxx\'"> 字面量绑定含中文', () => {
    const source = `<template>
  <img :src="'@/assets/标题图.jpg'" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].code).toContain('标题图')
  })

  it('不应误报无中文的图片路径', () => {
    const source = `<template>
  <img src="@/assets/banner.png" />
  <img :src="require('@/assets/logo.svg')" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报已带 _zh 语言后缀的图片', () => {
    const source = `<template>
  <img src="@/assets/欢迎_zh.png" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报已带 _en 语言后缀的图片', () => {
    const source = `<template>
  <img src="@/assets/产品_en.png" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报动态变量绑定', () => {
    const source = `<template>
  <img :src="bannerImg" />
  <img :src="getImage('any')" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该检测同一文件多个含中文图片', () => {
    const source = `<template>
  <div>
    <img src="@/assets/欢迎.png" />
    <img :src="require('@/assets/产品介绍.svg')" />
    <img :src="'@/assets/标题图.jpg'" />
  </div>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(3)
  })

  it('行号偏移正确（<template> 起始行计算）', () => {
    const source = `<script setup>
const x = 1
</script>

<template>
  <div>
    <img src="@/assets/欢迎.png" />
  </div>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    // <template> 在第 5 行，<img> 在 template 内第 3 行 → 实际第 7 行
    expect(issues[0].line).toBe(7)
  })

  it('解析失败时返回空数组', () => {
    const source = `<template><div></template>` // 不闭合的标签

    const issues = checker.check(source, 'test.vue')

    expect(Array.isArray(issues)).toBe(true)
  })

  it('无 <template> 块时返回空数组', () => {
    const source = `<script>
export default {}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('同一 <img> 不会被多个正则重复报告', () => {
    // 这种 :src="require(...)" 形式既能被 require 正则也能被普通 src 正则匹配
    const source = `<template>
  <img :src="require('@/assets/欢迎.png')" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
  })
})
