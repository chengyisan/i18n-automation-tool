import { describe, it, expect } from 'vitest'
import { CachedRefLocaleChecker } from '../checker/cachedRefLocaleChecker'

describe('CachedRefLocaleChecker', () => {
  const checker = new CachedRefLocaleChecker()

  it('应该检测 ref + .value = 含 t() 数据的模式', () => {
    const source = `<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const visible = ref([])

const update = () => {
  visible.value = items.map(i => ({ label: t(i.key) }))
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('cached-ref-locale')
    expect(issues[0].suggestion).toContain('watch(locale')
    expect(issues[0].suggestion).toContain('visible')
  })

  it('应该检测 filter 中含 t() 的赋值', () => {
    const source = `<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const filtered = ref([])

const refresh = () => {
  filtered.value = list.filter(l => l.label === t('common.active'))
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('cached-ref-locale')
  })

  it('应该检测多次赋值，每次产生独立 issue', () => {
    const source = `<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const data = ref([])

const reset = () => {
  data.value = [{ label: t('a') }]
}

const update = () => {
  data.value = [{ label: t('b') }]
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(2)
    expect(issues.every(i => i.type === 'cached-ref-locale')).toBe(true)
  })

  it('不应误报存在 watch(locale) 的情况', () => {
    const source = `<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const visible = ref([])

const update = () => {
  visible.value = items.map(i => ({ label: t(i.key) }))
}

watch(locale, () => {
  update()
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报存在 watch(refName) 的情况', () => {
    const source = `<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const source = ref([])
const visible = ref([])

const update = () => {
  visible.value = source.value.map(i => ({ label: t(i.key) }))
}

watch(visible, () => {
  // 同步逻辑
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报 ref(t(...)) 形式（由 ReactiveChecker 处理）', () => {
    const source = `<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const title = ref(t('common.title'))
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报赋值右侧无 t() 的情况', () => {
    const source = `<script setup>
import { ref } from 'vue'

const data = ref([])

const refresh = () => {
  data.value = [1, 2, 3]
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报普通对象属性赋值（非 .value）', () => {
    const source = `<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const data = ref({})

const update = () => {
  data.label = t('a') // 不是 .value 赋值
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报工厂函数模式（t 作为函数参数传入）', () => {
    const source = `<script>
import { ref } from 'vue'

const data = ref([])

function buildOptions(t) {
  data.value = [{ label: t('common.yes') }]
  return data.value
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该识别多个 cached ref 并独立判断', () => {
    const source = `<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const a = ref([])
const b = ref([])

const updateA = () => {
  a.value = [{ label: t('x') }]
}

const updateB = () => {
  b.value = [{ label: t('y') }]
}

watch(a, () => {})
// 注意：b 没有被 watch，但因为 locale 没监听，所以两个都会报
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].suggestion).toContain('"b"')
  })

  it('应该正确计算行号偏移', () => {
    const source = `<template>
  <div>hello</div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const data = ref([])
const update = () => {
  data.value = [{ label: t('a') }]
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].line).toBeGreaterThanOrEqual(5)
  })

  it('解析失败时返回空数组', () => {
    const source = `<script setup>
this is invalid {{{
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报无 ref 声明的脚本', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const data = []
data.value = [{ label: t('a') }]
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })
})
