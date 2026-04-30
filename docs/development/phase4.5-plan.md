# Phase 4.5: 遗留规则补完

## Context

Phase 3.5 识别出 12 条检测规则，其中 8 条已实现，剩余 4 条因优先级较低推迟。Phase 4 完成了 CLI 工具包，现在补完这 4 条遗留规则，完善工具的检测能力覆盖面。

项目中已有 `docs/development/phase4.5-plan.md` 作为初始计划文档，本次基于代码探索结果细化实施方案。

## 4 条遗留规则

| # | 规则 | 实现位置 | 复杂度 |
|---|------|---------|--------|
| 1 | factory-function-sync — 工厂函数在 setup 外部调用 useI18n/t() | adapter-vue3 ReactiveChecker 扩展 | 中 |
| 2 | menu-key-semantic — 菜单 key 使用纯数字而非语义化命名 | core 新增 MenuKeyChecker | 低 |
| 3 | api-locale-watch — API 拦截器未监听 locale 变化 | adapter-vue3 新增 ApiLocaleChecker | 高 |
| 4 | locale-code-format — locale code 格式校验 | core ConfigValidator 已有，无需额外开发 | 无 |

**本期实施策略**:
- 规则 1 (factory-function-sync) 和规则 2 (menu-key-semantic) 优先实现（复杂度低/中，价值明确）
- 规则 3 (api-locale-watch) 视时间决定（复杂度高，需要更多 AST 模式识别）
- 规则 4 (locale-code-format) 无需开发（ConfigValidator 已有 BCP 47 校验）

## 现有代码模式

### ReactiveChecker 模式（adapter-vue3）
- **文件**: `packages/adapter-vue3/src/checker/reactiveChecker.ts`
- **模式**: class 导出，`check(source, filePath)` 方法返回 `ReactiveIssue[]`
- **AST 解析**: 使用 `@vue/compiler-sfc` 解析 SFC，`@babel/parser` + `@babel/traverse` 解析 script
- **检测范围**: 只检查顶层声明（`path.parent.type === 'Program'`）
- **问题类型**: `ref-with-t`, `static-object-with-t`, `top-level-t-assignment`, `jsx-return-with-t`

### QualityChecker 模式（core）
- **文件**: `packages/core/src/quality/ChinglishChecker.ts`
- **模式**: class 导出，`check(text)` 方法返回 `QualityIssue[]`
- **检测逻辑**: 基于正则模式匹配，遍历 patterns 数组
- **问题结构**: `{ type, severity, message, suggestion, position?, context? }`

### CLI 集成模式
- **ReactiveChecker**: `checkReactive.ts` 遍历 `.vue` 文件，调用 `reactiveChecker.check(content, file)`
- **QualityChecker**: `checkQuality.ts` 读取语言包 JSON，递归提取 key-value，对每个 value 调用 `checker.check(value)`

## 实施计划

### 规则 1: factory-function-sync

**目标**: 检测工厂函数在 `<script setup>` 外部调用 `useI18n()` 或使用 `t()`

**实现方式**: 扩展 `ReactiveChecker`

**检测逻辑**:
1. 在 `FunctionDeclaration` 和 `VariableDeclaration` (箭头函数) 中检测
2. 判断函数定义位置是否在 `<script setup>` 外部（通过 `descriptor.scriptSetup` 判断）
3. 检测函数体内是否调用 `useI18n()` 或使用 `t()` / `$t()`
4. 生成新问题类型 `factory-function-sync`

**修改文件**:
- `packages/adapter-vue3/src/checker/reactiveChecker.ts` — 新增检测逻辑
- `packages/adapter-vue3/src/types.ts` — 扩展 `ReactiveIssue.type` 增加 `'factory-function-sync'`

**测试用例**:
- 工厂函数在 `<script>` 中调用 `useI18n()`
- 工厂函数在 `<script>` 中使用 `t()`
- 工厂函数在 `<script setup>` 中（正确，不报告）
- 工厂函数接收 `t` 作为参数（正确，不报告）

### 规则 2: menu-key-semantic

**目标**: 检测 `menu.*` 或 `nav.*` 开头的 key 使用纯数字而非语义化命名

**实现方式**: 新增 `MenuKeyChecker` class

**检测逻辑**:
1. 检测 key 是否以 `menu.` 或 `nav.` 开头
2. 使用正则 `/\.\d+$/` 匹配 key 的最后一段是否为纯数字
3. 生成 `menu-key-semantic` 类型的 `QualityIssue`

**新增文件**:
- `packages/core/src/quality/MenuKeyChecker.ts` — 新增 checker
- `packages/core/src/__tests__/MenuKeyChecker.test.ts` — 测试文件

**修改文件**:
- `packages/core/src/types.ts` — 扩展 `QualityIssue.type` 增加 `'menu-key-semantic'`
- `packages/core/src/index.ts` — 导出 `MenuKeyChecker`
- `packages/cli/src/commands/checkQuality.ts` — 集成 `MenuKeyChecker`

**测试用例**:
- 检测 `menu.1`、`nav.2`（报告）
- 检测 `menu.item.1`（报告）
- 忽略 `common.1`（不报告）
- 正确的 `menu.home`、`nav.about`（不报告）

### 规则 3: api-locale-watch（可选）

**目标**: 检测 axios/fetch 拦截器中使用 `locale.value` 但未包裹在 `watchEffect` 中

**实现方式**: 新增 `ApiLocaleChecker` class

**检测逻辑**:
1. 使用 `@babel/parser` + `@babel/traverse` 解析 script
2. 检测 `axios.interceptors.request.use` 或 `fetch` 调用
3. 检测拦截器函数体内是否使用 `locale.value` 或 `i18n.locale`
4. 检测拦截器是否包裹在 `watchEffect` 或 `watch` 中
5. 生成 `api-locale-watch` 类型的 `ReactiveIssue`

**新增文件**:
- `packages/adapter-vue3/src/checker/ApiLocaleChecker.ts` — 新增 checker
- `packages/adapter-vue3/src/__tests__/ApiLocaleChecker.test.ts` — 测试文件

**修改文件**:
- `packages/adapter-vue3/src/types.ts` — 扩展 `ReactiveIssue.type` 增加 `'api-locale-watch'`
- `packages/adapter-vue3/src/index.ts` — 导出 `ApiLocaleChecker`
- `packages/cli/src/commands/checkReactive.ts` — 集成 `ApiLocaleChecker`

**测试用例**:
- axios 拦截器未监听 locale（报告）
- fetch 拦截器未监听 locale（报告）
- 正确的 `watchEffect` 包裹（不报告）
- 动态获取 locale（不报告）

**复杂度评估**: 需要识别多种拦截器模式（axios、fetch、自定义），AST 遍历逻辑较复杂，建议视时间决定是否实施。

## 实施步骤

### Step 1: 规则 1 — factory-function-sync
1. 扩展 `packages/adapter-vue3/src/types.ts` 中的 `ReactiveIssue.type`
2. 修改 `packages/adapter-vue3/src/checker/reactiveChecker.ts` 新增检测逻辑
3. 编写 5+ 测试用例到 `packages/adapter-vue3/src/__tests__/reactiveChecker.test.ts`
4. 运行测试确保通过

### Step 2: 规则 2 — menu-key-semantic
1. 扩展 `packages/core/src/types.ts` 中的 `QualityIssue.type`
2. 新建 `packages/core/src/quality/MenuKeyChecker.ts`
3. 新建 `packages/core/src/__tests__/MenuKeyChecker.test.ts` 编写 5+ 测试用例
4. 更新 `packages/core/src/index.ts` 导出 `MenuKeyChecker`
5. 修改 `packages/cli/src/commands/checkQuality.ts` 集成 `MenuKeyChecker`
6. 运行测试确保通过

### Step 3: 规则 3 — api-locale-watch（可选）
1. 扩展 `packages/adapter-vue3/src/types.ts` 中的 `ReactiveIssue.type`
2. 新建 `packages/adapter-vue3/src/checker/ApiLocaleChecker.ts`
3. 新建 `packages/adapter-vue3/src/__tests__/ApiLocaleChecker.test.ts` 编写 5+ 测试用例
4. 更新 `packages/adapter-vue3/src/index.ts` 导出 `ApiLocaleChecker`
5. 修改 `packages/cli/src/commands/checkReactive.ts` 集成 `ApiLocaleChecker`
6. 运行测试确保通过

### Step 4: 文档和总结
1. 更新 `docs/lessons-learned.md` 补充规则说明
2. 更新 `docs/special-cases.md` 补充示例
3. 新建 `docs/development/phase4.5-summary.md` 记录开发总结
4. 运行全量测试确保无回归

## 关键文件清单

**修改文件（adapter-vue3）**:
- [packages/adapter-vue3/src/types.ts](packages/adapter-vue3/src/types.ts) — 扩展 ReactiveIssue.type
- [packages/adapter-vue3/src/checker/reactiveChecker.ts](packages/adapter-vue3/src/checker/reactiveChecker.ts) — 新增 factory-function-sync 检测
- [packages/adapter-vue3/src/index.ts](packages/adapter-vue3/src/index.ts) — 导出新 checker（如果有）
- [packages/adapter-vue3/src/__tests__/reactiveChecker.test.ts](packages/adapter-vue3/src/__tests__/reactiveChecker.test.ts) — 新增测试

**修改文件（core）**:
- [packages/core/src/types.ts](packages/core/src/types.ts) — 扩展 QualityIssue.type
- [packages/core/src/index.ts](packages/core/src/index.ts) — 导出 MenuKeyChecker

**新增文件（core）**:
- `packages/core/src/quality/MenuKeyChecker.ts`
- `packages/core/src/__tests__/MenuKeyChecker.test.ts`

**新增文件（adapter-vue3，可选）**:
- `packages/adapter-vue3/src/checker/ApiLocaleChecker.ts`
- `packages/adapter-vue3/src/__tests__/ApiLocaleChecker.test.ts`

**修改文件（cli）**:
- [packages/cli/src/commands/checkQuality.ts](packages/cli/src/commands/checkQuality.ts) — 集成 MenuKeyChecker
- [packages/cli/src/commands/checkReactive.ts](packages/cli/src/commands/checkReactive.ts) — 集成 ApiLocaleChecker（可选）

**文档文件**:
- `docs/lessons-learned.md` — 补充规则说明
- `docs/special-cases.md` — 补充示例
- `docs/development/phase4.5-summary.md` — 开发总结

## 验证方式

```bash
# 测试 core 包
cd packages/core
pnpm test MenuKeyChecker

# 测试 adapter-vue3 包
cd packages/adapter-vue3
pnpm test reactiveChecker
pnpm test ApiLocaleChecker  # 可选

# 测试 CLI 集成
cd packages/cli
pnpm build
node dist/cli.js check-quality .
node dist/cli.js check-reactive .

# 全量测试
pnpm test
```

测试应覆盖：
- factory-function-sync 的各种场景（setup 内外、useI18n、t() 使用）
- menu-key-semantic 的数字 key 检测和语义化 key 忽略
- api-locale-watch 的拦截器模式识别（可选）
- CLI 命令的正确输出和退出码

## 时间估算

- 规则 1 (factory-function-sync): 2-3 小时
- 规则 2 (menu-key-semantic): 1-2 小时
- 规则 3 (api-locale-watch): 3-4 小时（可选）
- 文档和测试: 1-2 小时

**总计**: 4-7 小时（不含规则 3）
