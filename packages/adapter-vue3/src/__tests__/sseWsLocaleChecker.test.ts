import { describe, it, expect } from 'vitest'
import { SseWsLocaleChecker } from '../checker/sseWsLocaleChecker'

describe('SseWsLocaleChecker', () => {
  const checker = new SseWsLocaleChecker()

  it('应该检测 fetchEventSource 缺少语言 header', () => {
    const source = `<script setup>
import { fetchEventSource } from '@microsoft/fetch-event-source'

await fetchEventSource('/api/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('sse-ws-locale-missing')
    expect(issues[0].suggestion).toContain('Accept-Language')
  })

  it('应该检测 new WebSocket 缺少语言查询参数', () => {
    const source = `<script setup>
const ws = new WebSocket('ws://api.example.com/stream')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('sse-ws-locale-missing')
    expect(issues[0].suggestion).toContain('WebSocket')
  })

  it('应该检测 new EventSource 缺少语言查询参数', () => {
    const source = `<script setup>
const es = new EventSource('/api/events')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('sse-ws-locale-missing')
    expect(issues[0].suggestion).toContain('EventSource')
  })

  it('不应误报已含 Accept-Language 的 fetchEventSource', () => {
    const source = `<script setup>
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getLanguage } from '@/lang'

await fetchEventSource('/api/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': getLanguage()
  }
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报已含 language 字段（Identifier 形式 key）的 fetchEventSource', () => {
    const source = `<script setup>
import { fetchEventSource } from '@microsoft/fetch-event-source'

await fetchEventSource('/api/stream', {
  headers: {
    language: 'zh-CN'
  }
})
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报 url 含 ?lang= 的 WebSocket', () => {
    const source = `<script setup>
const ws = new WebSocket('ws://api.example.com/stream?lang=zh-CN')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报 url 含 ?language= 的 EventSource', () => {
    const source = `<script setup>
const es = new EventSource('/api/events?language=en-US')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报模板字符串中含 lang= 的 WebSocket URL', () => {
    const source = `<script setup>
const lang = 'zh-CN'
const ws = new WebSocket(\`ws://api.example.com/stream?lang=\${lang}\`)
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('不应误报字符串拼接中含 lang= 的 WebSocket URL', () => {
    const source = `<script setup>
const baseUrl = 'ws://api.example.com/stream'
const ws = new WebSocket(baseUrl + '?lang=' + 'zh-CN')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该检测同一文件多个问题调用', () => {
    const source = `<script setup>
import { fetchEventSource } from '@microsoft/fetch-event-source'

const ws = new WebSocket('ws://a.com/s')
const es = new EventSource('/api/e')
await fetchEventSource('/api/x', { method: 'POST' })
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(3)
    expect(issues.every(i => i.type === 'sse-ws-locale-missing')).toBe(true)
  })

  it('应该正确计算行号偏移（基于 script setup 起始行）', () => {
    const source = `<template>
  <div>hello</div>
</template>

<script setup>
const ws = new WebSocket('ws://a.com/s')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(1)
    // template 占用 1-3 行，<script setup> 在第 5 行，内容从第 6 行开始
    expect(issues[0].line).toBeGreaterThanOrEqual(5)
  })

  it('解析失败时返回空数组', () => {
    const source = `<script setup>
this is not valid javascript {{{
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(0)
  })

  it('应该同时检测 script 和 script setup 块', () => {
    const source = `<script>
export default {
  mounted() {
    new WebSocket('ws://a.com/s1')
  }
}
</script>

<script setup>
new WebSocket('ws://a.com/s2')
</script>`

    const issues = checker.check(source, 'test.vue')

    expect(issues).toHaveLength(2)
  })
})
