import { describe, it, expect } from 'vitest'
import { ApiLocaleChecker } from '../checker/apiLocaleChecker'

describe('ApiLocaleChecker', () => {
  const checker = new ApiLocaleChecker()

  it('应该检测 onMounted 中使用 locale 的 API 请求且无 watch', () => {
    const source = `<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const data = ref([])

onMounted(() => {
  fetchData(locale.value)
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('api-locale-watch')
    expect(issues[0].suggestion).toContain('watch(locale')
  })

  it('应该检测 onBeforeMount 中使用 locale 的 API 请求', () => {
    const source = `<script setup>
import { ref, onBeforeMount } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const menuData = ref([])

onBeforeMount(() => {
  getMenuList(locale.value)
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('api-locale-watch')
  })

  it('不应误报已添加 watch(locale) 的情况', () => {
    const source = `<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const data = ref([])

onMounted(() => {
  fetchData(locale.value)
})

watch(locale, () => {
  fetchData(locale.value)
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报不使用 locale 的 API 请求', () => {
    const source = `<script setup>
import { ref, onMounted } from 'vue'

const data = ref([])

onMounted(() => {
  fetchStaticData()
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报非 API 函数调用', () => {
    const source = `<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const message = ref('')

onMounted(() => {
  console.log(locale.value)
  updateTitle(locale.value)
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该识别使用 i18n.locale 的情况', () => {
    const source = `<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const i18n = useI18n()
const data = ref([])

onMounted(() => {
  requestData(i18n.locale)
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('api-locale-watch')
  })
})

