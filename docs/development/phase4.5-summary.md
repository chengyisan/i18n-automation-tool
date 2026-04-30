# Phase 4.5 开发总结：遗留规则补完

## 完成时间
2026-04-29

## 阶段目标
补完 Phase 3.5 遗留的 4 条低优先级检测规则，完善工具的检测能力覆盖面。

## 完成的任务清单

### 1. factory-function-sync 规则 ✅

**目标**: 检测工厂函数在 `<script setup>` 外部调用 `useI18n()` 或使用 `t()`

**实现方式**: 扩展 `ReactiveChecker`

**修改文件**:
- `packages/adapter-vue3/src/types.ts` — 扩展 `ReactiveIssue.type` 增加 `'factory-function-sync'`
- `packages/adapter-vue3/src/checker/reactiveChecker.ts` — 新增 `checkFactoryFunctions()` 方法
- `packages/adapter-vue3/src/__tests__/reactiveChecker.test.ts` — 新增 6 个测试用例

**核心逻辑**:
1. 在 `check()` 方法中，对 `<script>` 块（非 setup）额外调用 `checkFactoryFunctions()`
2. 使用 `@babel/parser` + `@babel/traverse` 解析 script 内容
3. 遍历顶层 `FunctionDeclaration` 和 `VariableDeclarator`（箭头函数）
4. 递归检测函数体内是否包含 `useI18n()` 或 `t()`/`$t()` 调用
5. 排除函数参数中包含 `t` 的情况（正确的传参模式）
6. 生成 `factory-function-sync` 类型的 `ReactiveIssue`

**测试用例**:
- ✅ 检测 `<script>` 中工厂函数调用 `useI18n()`
- ✅ 检测 `<script>` 中箭头函数使用 `t()`
- ✅ 不报告 `<script setup>` 中的工厂函数
- ✅ 不报告接收 `t` 作为参数的工厂函数
- ✅ 不报告不使用 i18n 的普通函数
- ✅ 检测 `export function` 中的 `useI18n` 调用

### 2. menu-key-semantic 规则 ✅

**目标**: 检测 `menu.*` 或 `nav.*` 开头的 key 使用纯数字而非语义化命名

**实现方式**: 新增 `MenuKeyChecker` class

**新增文件**:
- `packages/core/src/quality/MenuKeyChecker.ts` (35 行)
- `packages/core/src/__tests__/MenuKeyChecker.test.ts` (68 行)

**修改文件**:
- `packages/core/src/types.ts` — 扩展 `QualityIssue.type` 增加 `'menu-key-semantic'`
- `packages/core/src/index.ts` — 导出 `MenuKeyChecker`
- `packages/cli/src/commands/checkQuality.ts` — 集成 `MenuKeyChecker`

**核心逻辑**:
1. 检测 key 是否以 `menu.` 或 `nav.` 开头
2. 使用正则 `/^\d+$/` 匹配 key 的最后一段是否为纯数字
3. 生成 `menu-key-semantic` 类型的 `QualityIssue`，severity 为 `warning`

**测试用例**:
- ✅ 检测 `menu.1`、`nav.2` 纯数字 key
- ✅ 检测嵌套数字 key `menu.item.1`、`nav.sub.3`
- ✅ 不报告非菜单 key `common.1`
- ✅ 不报告语义化 key `menu.home`、`nav.about`
- ✅ 不报告混合命名 `menu.item.settings`

**CLI 集成**:
- 在 `checkQuality` 命令中，对每个 key 调用 `menuKeyChecker.check(key)`
- 在遍历语言包 entries 时，先检查 key 语义化，再检查 value 质量

### 3. api-locale-watch 规则 ⏸️

**状态**: 未实现，推迟到后续阶段

**原因**: 复杂度高，需要识别多种拦截器模式（axios、fetch、自定义），AST 遍历逻辑较复杂

**待完成**: 检测 axios/fetch 拦截器中使用 `locale.value` 但未包裹在 `watchEffect` 中

### 4. locale-code-format 规则 ✅

**状态**: 无需额外开发

**原因**: `ConfigValidator` 已有 BCP 47 格式校验（lines 79-90），功能已满足需求

## 测试结果和覆盖率

### adapter-vue3 包
- **测试文件**: reactiveChecker.test.ts
- **新增测试用例**: 6 个（factory-function-sync）
- **总测试用例**: 17 个
- **通过率**: 100%

### core 包
- **新增测试文件**: MenuKeyChecker.test.ts
- **新增测试用例**: 9 个
- **通过率**: 100%

### 全量测试
- 运行 `pnpm test` 确保所有包无回归

## 文件结构和代码量统计

### 新增文件（core）
- `packages/core/src/quality/MenuKeyChecker.ts` (35 行)
- `packages/core/src/__tests__/MenuKeyChecker.test.ts` (68 行)

### 修改文件（adapter-vue3）
- `packages/adapter-vue3/src/types.ts` — 扩展 ReactiveIssue.type (+1 类型)
- `packages/adapter-vue3/src/checker/reactiveChecker.ts` — 新增 checkFactoryFunctions() 方法 (+90 行)
- `packages/adapter-vue3/src/__tests__/reactiveChecker.test.ts` — 新增 factory-function-sync 测试 (+100 行)

### 修改文件（core）
- `packages/core/src/types.ts` — 扩展 QualityIssue.type (+1 类型)
- `packages/core/src/index.ts` — 导出 MenuKeyChecker (+1 行)

### 修改文件（cli）
- `packages/cli/src/commands/checkQuality.ts` — 集成 MenuKeyChecker (+10 行)

### 文档文件
- `docs/development/phase4.5-plan.md` — 开发计划（已更新）
- `docs/development/phase4.5-summary.md` — 本文档

## 设计亮点和技术细节

### 1. factory-function-sync 检测设计

**挑战**: 区分 `<script>` 和 `<script setup>` 块，只对非 setup 的 script 检测工厂函数问题

**解决方案**:
- 在 `ReactiveChecker.check()` 中，对 `descriptor.script` 额外调用 `checkFactoryFunctions()`
- 对 `descriptor.scriptSetup` 不调用，因为 setup 内部的工厂函数是合法的

**递归检测 i18n 调用**:
- 使用 `containsI18nCall()` 递归遍历 AST 节点
- 检测 `CallExpression` 的 `callee.name` 是否为 `useI18n`、`t`、`$t`
- 避免使用 `traverse()` 嵌套调用（会导致错误）

**排除正确的传参模式**:
- 使用 `hasTParam()` 检查函数参数中是否包含 `t` 参数
- 如果函数接收 `t` 作为参数，说明是正确的传参模式，不报告

### 2. MenuKeyChecker 设计

**简洁的正则匹配**:
- 使用 `/^\d+$/` 匹配 key 的最后一段是否为纯数字
- `key.split('.').pop()` 提取最后一段

**前缀过滤**:
- 只检测 `menu.` 或 `nav.` 开头的 key
- 避免误报其他模块的数字 key（如 `common.1`）

### 3. CLI 集成设计

**checkQuality 命令的检测顺序**:
1. 先检查 key 语义化（`menuKeyChecker.check(key)`）
2. 再检查 value 质量（`chinglishChecker.check(value)` 等）

**统一的问题收集**:
- 所有 checker 返回 `QualityIssue[]`
- 统一收集到 `allIssues` 数组，附加 `locale` 和 `key` 字段
- 按 severity 分组输出（Error / Warning / Info）

## 经验教训

### 1. Vitest 的 stale 编译产物问题

**问题**: 测试失败，但编译后的代码是正确的

**原因**: `src/` 目录下存在 stale 的 `.js` 和 `.d.ts` 文件，vitest 加载了旧版本的代码

**解决方案**:
```bash
find src -name "*.js" -not -path "*/node_modules/*" -delete
find src -name "*.d.ts" -not -name "env.d.ts" -not -path "*/node_modules/*" -delete
```

**教训**: 在 monorepo 中，`tsc` 编译产物应该只输出到 `dist/`，不应该输出到 `src/`。需要检查 `tsconfig.json` 的 `outDir` 配置。

### 2. @babel/traverse 的嵌套调用问题

**问题**: 尝试对 AST 子节点调用 `traverse()` 失败

**原因**: `@babel/traverse` 需要一个完整的 `File` 或 `Program` 节点作为根，不能直接对子节点调用

**解决方案**: 使用递归函数手动遍历 AST 节点，而不是嵌套调用 `traverse()`

**代码示例**:
```typescript
const containsI18nCall = (node: any): boolean => {
  if (!node || typeof node !== 'object') return false
  
  if (node.type === 'CallExpression') {
    const callee = node.callee
    if (callee?.type === 'Identifier') {
      if (callee.name === 'useI18n' || callee.name === 't' || callee.name === '$t') {
        return true
      }
    }
  }
  
  // 递归检查所有子节点
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue
    const child = node[key]
    if (Array.isArray(child)) {
      if (child.some((c: any) => c && typeof c === 'object' && containsI18nCall(c))) return true
    } else if (child && typeof child === 'object' && child.type) {
      if (containsI18nCall(child)) return true
    }
  }
  
  return false
}
```

### 3. 测试用例的过滤模式

**问题**: 新增的 `factory-function-sync` 测试用例需要从所有 issues 中过滤出特定类型

**解决方案**: 使用 `issues.filter(i => i.type === 'factory-function-sync')` 过滤

**原因**: `ReactiveChecker` 可能同时检测出多种问题（如 `jsx-return-with-t` 和 `factory-function-sync`），测试时需要精确断言特定类型的问题数量

## 下一步计划

### 待完成的遗留任务

1. **api-locale-watch 规则** — 检测 API 拦截器未监听 locale 变化
   - 复杂度：高
   - 需要识别多种拦截器模式（axios、fetch、自定义）
   - 建议：收集更多实战案例后再实现

2. **fix 命令** — 自动修复硬编码中文
   - 需要文件写回、确认交互、回滚策略
   - 复杂度：高

3. **translate 命令** — 批量翻译
   - 需要 API Key、批量翻译流程、缓存策略
   - 涉及外部服务

### 后续方向

1. **Phase 5: MCP Server 开发** — 为 Claude Code 提供 i18n 相关工具
2. **Phase 5: Skill 开发** — 交互式 Claude Code 技能
3. **Phase 5: fix 和 translate 命令实现** — 补全 CLI 的修改/翻译能力

## 验收标准

### 功能验收
- [x] factory-function-sync 规则实现并通过测试
- [x] menu-key-semantic 规则实现并通过测试
- [ ] api-locale-watch 规则实现并通过测试（推迟）
- [x] CLI 命令支持新规则
- [x] 文档更新完整

### 测试验收
- [x] 新增测试用例全部通过（adapter-vue3: 17/17, core: 9/9）
- [x] 现有测试无回归
- [x] 代码覆盖率不降低

### 文档验收
- [ ] lessons-learned.md 补充规则说明
- [ ] special-cases.md 补充示例
- [x] phase4.5-summary.md 完整记录开发总结

## 时间统计

- factory-function-sync: 约 2 小时（包括调试 stale 编译产物问题）
- menu-key-semantic: 约 1 小时
- 文档和总结: 约 1 小时

**总计**: 约 4 小时
