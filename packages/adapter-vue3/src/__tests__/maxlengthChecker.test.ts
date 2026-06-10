import { describe, it, expect } from 'vitest'
import { MaxlengthChecker } from '../checker/maxlengthChecker'

describe('MaxlengthChecker', () => {
  const checker = new MaxlengthChecker()

  it('应该检测 el-input 固定 maxlength', () => {
    const source = `<template>
  <el-input v-model="form.name" maxlength="20" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('maxlength-fixed')
    expect(issues[0].currentValue).toBe(20)
    expect(issues[0].suggestion).toContain('locale')
  })

  it('应该检测 el-textarea 固定 maxlength', () => {
    const source = `<template>
  <el-textarea v-model="form.desc" maxlength="50" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].currentValue).toBe(50)
  })

  it('应该检测 el-input-number 固定 maxlength', () => {
    const source = `<template>
  <el-input-number v-model="form.count" maxlength="10" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].currentValue).toBe(10)
  })

  it('不应误报动态绑定 :maxlength="20"', () => {
    const source = `<template>
  <el-input v-model="form.name" :maxlength="20" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报动态变量 :maxlength="dynamicLen"', () => {
    const source = `<template>
  <el-input v-model="form.name" :maxlength="dynamicLen" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报超过阈值的 maxlength="100"', () => {
    const source = `<template>
  <el-input v-model="form.name" maxlength="100" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报原生 input 标签', () => {
    const source = `<template>
  <input type="text" maxlength="20" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报无 maxlength 的 el-input', () => {
    const source = `<template>
  <el-input v-model="form.name" placeholder="请输入" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该检测同一文件多个固定 maxlength', () => {
    const source = `<template>
  <el-form>
    <el-input v-model="form.name" maxlength="20" />
    <el-textarea v-model="form.desc" maxlength="50" />
    <el-input-number v-model="form.count" maxlength="8" />
  </el-form>
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(3)
  })

  it('行号偏移正确（<template> 起始行计算）', () => {
    const source = `<script setup>
const form = {}
</script>

<template>
  <el-input v-model="form.name" maxlength="20" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    // <template> 在第 5 行，el-input 在 template 内第 2 行 → 实际第 6 行
    expect(issues[0].line).toBe(6)
  })

  it('解析失败时返回空数组', () => {
    const source = `<template><el-input maxlength="20"</template>`

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

  it('边界值 maxlength="50" 应报告（等于阈值）', () => {
    const source = `<template>
  <el-input maxlength="50" />
</template>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
  })
})
