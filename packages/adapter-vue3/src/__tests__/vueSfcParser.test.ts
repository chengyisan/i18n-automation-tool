import { describe, it, expect } from 'vitest'
import { VueSfcParser } from '../parser/vueSfcParser'

describe('VueSfcParser', () => {
  const parser = new VueSfcParser()

  it('应该解析标准 Vue SFC', () => {
    const source = `<template>
  <div>Hello</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.div { color: red; }
</style>`

    const result = parser.parse(source, 'test.vue')

    expect(result.filePath).toBe('test.vue')
    expect(result.template).not.toBeNull()
    expect(result.template!.content).toContain('<div>Hello</div>')
    expect(result.scriptSetup).not.toBeNull()
    expect(result.scriptSetup!.lang).toBe('ts')
    expect(result.scriptSetup!.ast).not.toBeNull()
    expect(result.script).toBeNull()
    expect(result.styles).toHaveLength(1)
    expect(result.styles[0].scoped).toBe(true)
  })

  it('应该解析含 TypeScript 的 SFC', () => {
    const source = `<script setup lang="ts">
const name: string = 'test'
</script>`

    const result = parser.parse(source, 'test.vue')

    expect(result.scriptSetup).not.toBeNull()
    expect(result.scriptSetup!.lang).toBe('ts')
    expect(result.scriptSetup!.ast).not.toBeNull()
  })

  it('应该解析含多个 style 块的 SFC', () => {
    const source = `<template><div /></template>

<style>
.global { color: blue; }
</style>

<style scoped>
.local { color: red; }
</style>`

    const result = parser.parse(source, 'test.vue')

    expect(result.styles).toHaveLength(2)
    expect(result.styles[0].scoped).toBe(false)
    expect(result.styles[1].scoped).toBe(true)
  })

  it('应该解析只有 template 的 SFC', () => {
    const source = `<template><div>Hello</div></template>`

    const result = parser.parse(source, 'test.vue')

    expect(result.template).not.toBeNull()
    expect(result.script).toBeNull()
    expect(result.scriptSetup).toBeNull()
  })

  it('应该解析只有 script 的 SFC', () => {
    const source = `<script>
export default { name: 'Test' }
</script>`

    const result = parser.parse(source, 'test.vue')

    expect(result.template).toBeNull()
    expect(result.script).not.toBeNull()
    expect(result.script!.lang).toBe('js')
    expect(result.scriptSetup).toBeNull()
  })

  it('应该解析同时有 script 和 script setup 的 SFC', () => {
    const source = `<script>
export default { inheritAttrs: false }
</script>

<script setup>
const msg = 'hello'
</script>`

    const result = parser.parse(source, 'test.vue')

    expect(result.script).not.toBeNull()
    expect(result.scriptSetup).not.toBeNull()
  })

  it('应该正确计算 startLine', () => {
    const source = `<template>
  <div />
</template>

<script setup>
const x = 1
</script>`

    const result = parser.parse(source, 'test.vue')

    expect(result.template!.startLine).toBe(1)
    expect(result.scriptSetup!.startLine).toBe(5)
  })
})
