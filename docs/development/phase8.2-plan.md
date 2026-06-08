# Phase 8.2 开发计划：P1 规则检测器实现

## Context（背景）

Phase 8.1 已完成（commit `6bfd129`，tag `v0.8.0`），交付了 3 个 P0 检测器：
- `BackendContractChecker`（规则 13）
- `LocaleConstantChecker`（规则 19）
- `FragmentedTranslationChecker`（规则 16）

现在进入 Phase 8.2，实现剩余的 2 个 P1 检测器，对应 [docs/lessons-learned.md](../lessons-learned.md) 的规则 17 和规则 18。这两条规则源自实际 i18n 改造项目的真实问题：
- **规则 17（SSE/WebSocket 语言参数传递）**：`fetchEventSource`/`EventSource`/`WebSocket` 绕过 axios 拦截器，需手动传递语言参数（参考实际提交 `164068ff0`、`67cd576e1`）
- **规则 18（缓存 ref 响应式更新）**：将 `computed` 或 `t()` 结果缓存到 `ref` 后，切换语言不会自动同步（参考实际提交 `3fe74dbab` 侧边栏收起场景）

P2 规则（图片 i18n 切换、maxlength 动态适配）推迟到后续阶段，原因：场景较少、实现成本与收益比偏低。

## 阶段目标

1. 实现 `SseWsLocaleChecker`，检测 SSE/WebSocket 调用缺少语言参数
2. 实现 `CachedRefLocaleChecker`，检测 `ref` 缓存含 `t()` 数据缺少 `watch(locale)` 同步
3. 集成两个检测器到 `check-reactive` CLI 命令
4. 编写规格文档和阶段总结
5. 通过完整构建和测试

## 历史遗留任务

读取 `docs/development/` 各 summary 文件后确认：Phase 8.1 总结中"未完成的任务"为"无遗留任务"。Phase 8.2 不需要补完历史任务。

## 任务分解

### 任务 1：SseWsLocaleChecker（规则 17）

**优先级**：P1（高）

**位置**：`packages/adapter-vue3/src/checker/sseWsLocaleChecker.ts`

**功能范围**：
- 检测 `fetchEventSource(url, options)` 调用，options 缺少 `Accept-Language`/`language`/`lang` header
- 检测 `new EventSource(url)`，url 缺少 `lang`/`language` 查询参数
- 检测 `new WebSocket(url)`，url 缺少 `lang`/`language` 查询参数

**不包含**：
- 自定义封装的 SSE/WS 类（如 `MyEventSource`、`MyWS`）— 命名不规范，识别成本高
- 跨文件追踪 url 来源（如 `const url = buildUrl()` 形式）
- 通过 first-message 传递语言（`ws.send({ lang })`）— 检测困难，留作后续增强

**输出类型**：扩展 `ReactiveIssue.type` 增加 `'sse-ws-locale-missing'`

**实现步骤**：
1. 复用 `apiLocaleChecker.ts` 的 SFC + AST 解析骨架（sfcParse → babelParse → traverse）
2. AST visitor 中匹配三种模式：
   - `CallExpression` 且 `callee.name === 'fetchEventSource'`
   - `NewExpression` 且 `callee.name === 'EventSource'`
   - `NewExpression` 且 `callee.name === 'WebSocket'`
3. 对 `fetchEventSource`：检查第 2 个参数（`ObjectExpression`）的 `headers` 属性是否包含语言相关 key
   - 语言 key 列表：`'Accept-Language'`、`'accept-language'`、`'language'`、`'lang'`
   - key 可能是 `StringLiteral`（`'Accept-Language': xxx`）或 `Identifier`（`language: xxx`）
4. 对 `new EventSource`/`new WebSocket`：检查第 1 个参数（url）字符串字面量或模板字符串中是否包含 `lang=` 或 `language=`
   - `StringLiteral`：直接 `value.includes('lang=')`
   - `TemplateLiteral`：拼接 quasis 后判断
   - `BinaryExpression`（字符串拼接）：递归收集所有 StringLiteral
5. 缺失时生成 `ReactiveIssue`，suggestion 因模式不同而不同：
   - SSE：`添加语言 header：headers: { "Accept-Language": getLanguage(), "language": getLanguage() }`
   - WebSocket/EventSource：`在 URL 中添加语言参数：?lang=${getLanguage()}`

---

### 任务 2：CachedRefLocaleChecker（规则 18）

**优先级**：P1（高）

**位置**：`packages/adapter-vue3/src/checker/cachedRefLocaleChecker.ts`

**功能范围**：
- 检测两阶段模式：`const xxx = ref(...)` 声明 → 后续函数体中 `xxx.value = expr` 赋值，且 `expr` 含 `t()`/`$t()` 调用
- 同一 script 中若存在 `watch(locale, ...)`，则不报告（已正确同步）
- 同一 script 中若存在 `watch(<refName>, ...)`（间接同步），也不报告

**不包含**：
- 跨文件追踪（`xxx` 由 composable 暴露的场景）
- 深度对象嵌套赋值（`xxx.value.list = ...`）
- 已被 `ReactiveChecker` 覆盖的 `ref(t(...))` 直接初始化模式（避免重复报告）

**输出类型**：扩展 `ReactiveIssue.type` 增加 `'cached-ref-locale'`

**实现步骤**：
1. 复用 SFC + AST 解析骨架，复用 `reactiveChecker.ts` 中的 `containsTCall()` 工具函数
2. **第一遍遍历**：收集 script 中所有 `const/let xxx = ref(...)` 声明，记录到 `Map<refName, declaratorNode>`
   - 排除 `ref(t(...))` 形式（已由 ReactiveChecker 覆盖）
3. **第二遍遍历**：收集所有 `xxx.value = expr` 赋值（`AssignmentExpression`，左侧是 `MemberExpression` 且属性为 `value`）
   - 判断 `expr` 是否直接包含 `t()`/`$t()` 调用（用 `containsTCall`）
4. **第三遍遍历**：检测是否存在 `watch(...)` 调用且首参为 `locale`，或首参为该 ref 名
5. 缺失同步时报告：每个赋值点产生一个 `ReactiveIssue`
6. 行号、列号基于赋值表达式节点位置 + script 起始行

**MVP 简化策略**：
- 第一版只检测：赋值表达式右侧"直接包含 t() 调用"的明确模式（最常见、最有价值）
- computed 间接引用作为后续增强，留作 phase8.3 优化

---

### 任务 3：CLI 集成

**修改**：`packages/cli/src/commands/checkReactive.ts`

**变更**：
- import 增加 `SseWsLocaleChecker`、`CachedRefLocaleChecker`
- 实例化两个新 checker
- 增加 `sseWsIssues`、`cachedRefIssues` 数组
- 循环中调用 `.check(content, file)` 收集
- JSON 输出新增字段：`sseWsLocaleIssues`、`cachedRefLocaleIssues`
- 人类可读输出新增两段提示
- `totalIssues` 统计加入两个新数组长度

---

### 任务 4：类型定义和导出更新

**修改 1**：`packages/adapter-vue3/src/types.ts`

`ReactiveIssue.type` 联合类型扩展，增加 `'sse-ws-locale-missing'` 和 `'cached-ref-locale'`。

**修改 2**：`packages/adapter-vue3/src/index.ts`

```typescript
export { SseWsLocaleChecker } from './checker/sseWsLocaleChecker.js'
export { CachedRefLocaleChecker } from './checker/cachedRefLocaleChecker.js'
```

---

### 任务 5：单元测试

**新增文件**：
- `packages/adapter-vue3/src/__tests__/sseWsLocaleChecker.test.ts`
- `packages/adapter-vue3/src/__tests__/cachedRefLocaleChecker.test.ts`

**测试约定**（参考 `apiLocaleChecker.test.ts` 风格）：
- Vitest `describe` / `it` / `expect`
- 中文 `it` 描述
- 顶部实例化 checker
- 模板字符串构造 Vue SFC
- 断言 `toHaveLength()` + `expect(issues[0].type).toBe(...)` + `suggestion` 内容

**覆盖率目标**：> 80%

---

### 任务 6：文档落地

**计划落地**：本文件（`docs/development/phase8.2-plan.md`）

**规格文档**：
- `docs/specs/adapter-vue3/SseWsLocaleChecker.md`
- `docs/specs/adapter-vue3/CachedRefLocaleChecker.md`

**阶段总结**：`docs/development/phase8.2-summary.md`（实施完成后）

## 实现顺序

1. 写入计划文档（本文件）
2. 类型定义先行（types.ts）
3. SseWsLocaleChecker + 测试
4. CachedRefLocaleChecker + 测试
5. 导出更新（index.ts）
6. CLI 集成（checkReactive.ts）
7. 完整构建（pnpm build）
8. 完整测试（pnpm test）
9. 规格文档
10. 阶段总结

## 验收标准

- [ ] `SseWsLocaleChecker` 实现完成，所有测试通过
- [ ] `CachedRefLocaleChecker` 实现完成，所有测试通过
- [ ] 类型定义扩展无 TypeScript 编译错误
- [ ] CLI `check-reactive` 命令正确输出新规则的检测结果
- [ ] `pnpm build` 全部包构建成功
- [ ] `pnpm test` 全部通过（不破坏现有测试）
- [ ] 测试覆盖率 > 80%
- [ ] 规格文档完整：SseWsLocaleChecker.md、CachedRefLocaleChecker.md
- [ ] phase8.2-plan.md 和 phase8.2-summary.md 落地到 `docs/development/`

## 关键文件

**新增文件**：
- `packages/adapter-vue3/src/checker/sseWsLocaleChecker.ts`
- `packages/adapter-vue3/src/checker/cachedRefLocaleChecker.ts`
- `packages/adapter-vue3/src/__tests__/sseWsLocaleChecker.test.ts`
- `packages/adapter-vue3/src/__tests__/cachedRefLocaleChecker.test.ts`
- `docs/development/phase8.2-plan.md`
- `docs/development/phase8.2-summary.md`
- `docs/specs/adapter-vue3/SseWsLocaleChecker.md`
- `docs/specs/adapter-vue3/CachedRefLocaleChecker.md`

**修改文件**：
- `packages/adapter-vue3/src/types.ts`
- `packages/adapter-vue3/src/index.ts`
- `packages/cli/src/commands/checkReactive.ts`

## 参考实现

**SFC + AST 解析骨架**：
- `packages/adapter-vue3/src/checker/apiLocaleChecker.ts`

**AST 工具函数**：
- `packages/adapter-vue3/src/checker/reactiveChecker.ts:9-32` — `containsTCall()`
- `packages/adapter-vue3/src/checker/apiLocaleChecker.ts:22-63` — `usesLocale()`

**经验教训依据**：
- `docs/lessons-learned.md` 规则 17、规则 18

## 后续计划（Phase 8.3，可选）

完成 Phase 8.2 后，剩余 P2 规则：
- 表单 maxlength 动态适配（规则 15） — `MaxlengthChecker`
- 图片资源多语言切换（规则 14） — `ImageI18nChecker`

`CachedRefLocaleChecker` 增强：
- 支持 computed 间接引用追踪
- 支持深层对象赋值

是否进入 Phase 8.3 由用户决定。
