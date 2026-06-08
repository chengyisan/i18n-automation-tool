# SseWsLocaleChecker 规格文档

## 功能描述

检测 SSE/WebSocket 等绕过 axios 拦截器的特殊请求是否携带语言参数。

普通 HTTP 请求通过 axios 拦截器自动添加 `Accept-Language` header，但以下请求不会经过该拦截器：
- `fetchEventSource()` — Microsoft fetch-event-source SSE 客户端
- `new EventSource()` — 浏览器原生 SSE
- `new WebSocket()` — 浏览器原生 WebSocket

如果不手动传递语言参数，后端无法识别用户当前语言，可能返回错误语种的内容或鉴权失败。

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容
- `filePath: string` — 文件路径

**输出**: `ReactiveIssue[]`，type 为 `'sse-ws-locale-missing'`

```typescript
interface ReactiveIssue {
  type: 'sse-ws-locale-missing'
  filePath: string
  line: number
  column: number
  code: string
  suggestion: string
}
```

## 核心检测规则

### 规则 1: fetchEventSource 缺少语言 header

```javascript
// ❌ 错误：headers 中缺少语言参数
await fetchEventSource('/api/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})

// ✅ 正确：headers 中包含语言参数
await fetchEventSource('/api/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': getLanguage()
  }
})
```

**检测逻辑**:
- 匹配 `CallExpression` 且 `callee.name === 'fetchEventSource'`
- 检查第 2 个参数（`ObjectExpression`）的 `headers` 属性
- 判断 headers 对象的 key 集合是否包含 `Accept-Language`/`accept-language`/`language`/`lang`（不区分大小写）
- key 同时支持 `StringLiteral` 和 `Identifier` 形式

### 规则 2: new EventSource / new WebSocket 缺少 URL 语言参数

```javascript
// ❌ 错误：URL 中缺少语言参数
const ws = new WebSocket('ws://api.example.com/stream')
const es = new EventSource('/api/events')

// ✅ 正确：URL 中包含 lang= 或 language=
const ws = new WebSocket(`ws://api.example.com/stream?lang=${getLanguage()}`)
const es = new EventSource('/api/events?language=zh-CN')
```

**检测逻辑**:
- 匹配 `NewExpression` 且 `callee.name` 为 `EventSource` 或 `WebSocket`
- 提取第 1 个参数（URL），收集字符串片段
- 支持 `StringLiteral`、`TemplateLiteral`、`BinaryExpression`（字符串拼接）
- 拼接后判断是否包含 `lang=` 或 `language=`（不区分大小写）

## 边界情况处理

### 1. 自定义封装类
```javascript
// 不检测：MyEventSource、SseClient 等自定义类
const sse = new MyEventSource(url)
```
原因：命名不规范，识别成本高，可能导致误报。

### 2. URL 来自函数调用
```javascript
// 不检测：URL 由函数返回，跨文件追踪复杂
const ws = new WebSocket(buildUrl())
```
保守策略：当前实现只检查直接的字符串字面量、模板字符串、字符串拼接。

### 3. 通过首条消息传递语言
```javascript
// 当前实现不检测：first-message 模式
const ws = new WebSocket('/api/ws')
ws.onopen = () => ws.send({ type: 'init', lang: getLanguage() })
```
该场景对静态分析挑战大，留作后续增强。

## 测试用例

### 检出场景
- ✅ `fetchEventSource(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })`
- ✅ `new WebSocket('ws://api.example.com/stream')`
- ✅ `new EventSource('/api/events')`
- ✅ 同一文件多个 SSE/WS 调用全部检测
- ✅ 同时检测 `<script>` 和 `<script setup>` 块

### 不误报场景
- ✅ `fetchEventSource(url, { headers: { 'Accept-Language': getLanguage() } })`
- ✅ `fetchEventSource(url, { headers: { language: 'zh-CN' } })`（Identifier key）
- ✅ `new WebSocket('ws://x/?lang=zh-CN')`
- ✅ `new EventSource('/api/events?language=en-US')`
- ✅ 模板字符串：`` new WebSocket(`${baseUrl}?lang=${lang}`) ``
- ✅ 字符串拼接：`new WebSocket(baseUrl + '?lang=' + lang)`

### 边界
- ✅ 解析失败返回空数组
- ✅ 行号偏移正确（基于 SFC 块起始行）

## 实现注意事项

### 1. 不区分大小写比较
`Accept-Language`、`accept-language`、`Language`、`lang` 都需识别。实现中通过 `toLowerCase()` 后与小写关键字数组比较。

### 2. URL 字符串收集
`collectStringFragments(node)` 递归收集所有字符串片段，支持 3 种形式：
- `StringLiteral` → `[node.value]`
- `TemplateLiteral` → `quasis.map(q => q.value.cooked)`
- `BinaryExpression(+)` → 递归收集左右子节点

### 3. ESM 兼容性
`@babel/traverse` 使用 `(_traverse as any).default || _traverse` 兼容 ESM/CJS。

### 4. 复用模式
SFC + AST 解析骨架完全复用自 `apiLocaleChecker.ts`：sfcParse → 提取 script/scriptSetup → babelParse → traverse。

## 与其他检测器的关系

- **ApiLocaleChecker**: 检测 axios/fetch 的 onMounted 是否监听 locale（互补）
- **SseWsLocaleChecker**: 检测 SSE/WebSocket 是否携带语言参数（本检测器）

两者互补，覆盖了"普通 HTTP 请求"和"特殊长连接请求"两个场景。
