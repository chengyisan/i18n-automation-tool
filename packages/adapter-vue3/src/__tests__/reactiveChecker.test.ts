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

  it('应该检测函数 return 数组包含 t()', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
function useColumns() {
  return [
    { title: t('table.name'), dataIndex: 'name' },
    { title: t('table.age'), dataIndex: 'age' }
  ]
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('jsx-return-with-t')
    expect(issues[0].suggestion).toContain('computed(() => useXxx())')
  })

  it('应该检测箭头函数 return 对象包含 t()', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const useOptions = () => {
  return { label: t('common.yes'), value: 1 }
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('jsx-return-with-t')
  })

  it('不应误报 return computed(() => [...])', () => {
    const source = `<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
function useColumns() {
  return computed(() => [
    { title: t('table.name'), dataIndex: 'name' }
  ])
}
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  describe('factory-function-sync', () => {
    it('应该检测 <script> 中工厂函数调用 useI18n()', () => {
      const source = `<script>
function createOptions() {
  const { t } = useI18n()
  return [
    { label: t('common.yes'), value: 1 },
    { label: t('common.no'), value: 0 }
  ]
}
export default { setup() { return {} } }
</script>`

      const issues = checker.check(source, 'test.vue')

      const factoryIssues = issues.filter(i => i.type === 'factory-function-sync')
      expect(factoryIssues).toHaveLength(1)
      expect(factoryIssues[0].suggestion).toContain('t 作为参数传入')
    })

    it('应该检测 <script> 中箭头函数使用 t()', () => {
      const source = `<script>
const createMenu = () => {
  return [
    { label: t('menu.home'), path: '/home' }
  ]
}
export default { setup() { return {} } }
</script>`

      const issues = checker.check(source, 'test.vue')

      const factoryIssues = issues.filter(i => i.type === 'factory-function-sync')
      expect(factoryIssues).toHaveLength(1)
    })

    it('不应报告 <script setup> 中的工厂函数', () => {
      const source = `<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
function createOptions() {
  return [
    { label: t('common.yes'), value: 1 }
  ]
}
</script>`

      const issues = checker.check(source, 'test.vue')

      const factoryIssues = issues.filter(i => i.type === 'factory-function-sync')
      expect(factoryIssues).toHaveLength(0)
    })

    it('不应报告接收 t 作为参数的工厂函数', () => {
      const source = `<script>
function createOptions(t) {
  return [
    { label: t('common.yes'), value: 1 }
  ]
}
export default { setup() { return {} } }
</script>`

      const issues = checker.check(source, 'test.vue')

      const factoryIssues = issues.filter(i => i.type === 'factory-function-sync')
      expect(factoryIssues).toHaveLength(0)
    })

    it('不应报告不使用 i18n 的普通函数', () => {
      const source = `<script>
function formatDate(date) {
  return date.toISOString()
}
export default { setup() { return {} } }
</script>`

      const issues = checker.check(source, 'test.vue')

      const factoryIssues = issues.filter(i => i.type === 'factory-function-sync')
      expect(factoryIssues).toHaveLength(0)
    })

    it('应该检测 export function 中的 useI18n 调用', () => {
      const source = `<script>
export function useColumns() {
  const { t } = useI18n()
  return [
    { title: t('table.name'), dataIndex: 'name' }
  ]
}
</script>`

      const issues = checker.check(source, 'test.vue')

      const factoryIssues = issues.filter(i => i.type === 'factory-function-sync')
      expect(factoryIssues).toHaveLength(1)
    })
  })
})
