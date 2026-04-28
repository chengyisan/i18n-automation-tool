import { describe, it, expect } from 'vitest'
import { ReactiveChecker } from '../checker/reactiveChecker'

describe('ReactiveChecker', () => {
  const checker = new ReactiveChecker()

  it('应该检测 ref(t()) 模式', () => {
    const source = `<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const title = ref(t('common.title'))
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('ref-with-t')
    expect(issues[0].suggestion).toContain('computed')
  })

  it('应该检测静态数组中的 t() 调用', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const options = [{ label: t('common.yes'), value: 1 }]
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('static-object-with-t')
  })

  it('应该检测静态对象中的 t() 调用', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const config = { title: t('common.title'), desc: t('common.desc') }
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('static-object-with-t')
  })

  it('应该检测顶层 const = t() 赋值', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const title = t('common.title')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('top-level-t-assignment')
  })

  it('不应误报 computed(() => t())', () => {
    const source = `<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const title = computed(() => t('common.title'))
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报函数内部的 t() 调用', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
function getMessage() {
  const msg = t('common.message')
  return msg
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('无问题时应返回空数组', () => {
    const source = `<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const title = computed(() => t('common.title'))
const count = ref(0)
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该检测 $t() 调用', () => {
    const source = `<script setup>
const title = $t('common.title')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('top-level-t-assignment')
  })
})
