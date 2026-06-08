# CachedRefLocaleChecker 规格文档

## 功能描述

检测将含 `t()` 调用的数据缓存到 `ref` 后，缺少 `watch(locale)` 同步的场景。

典型问题模式（侧边栏收起、折叠面板、动态工具栏）：
1. 声明 `const visible = ref([])` 缓存数据
2. 在某个函数中赋值 `visible.value = items.map(i => ({ label: t(i.key) }))`
3. 切换语言后 `visible.value` 不会自动更新，因为 `ref` 的值已被赋值固化

`computed` 不会有此问题，因为它会在 `t()` 重新计算时自动追踪。但当业务需要"按需缓存"（例如根据容器宽度只显示前 N 项）时，开发者会用 `ref` + 函数赋值，此时必须 `watch(locale)` 重新触发赋值。

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容
- `filePath: string` — 文件路径

**输出**: `ReactiveIssue[]`，type 为 `'cached-ref-locale'`

```typescript
interface ReactiveIssue {
  type: 'cached-ref-locale'
  filePath: string
  line: number
  column: number
  code: string
  suggestion: string  // 包含具体 ref 名称，便于定位
}
```

## 核心检测逻辑

### 三遍遍历

1. **第一遍 — 收集 ref 声明**：遍历 `VariableDeclarator`，记录所有 `const/let xxx = ref(...)` 中的 `xxx` 到 `Set<refName>`
   - 排除 `ref(t(...))` 形式（已由 `ReactiveChecker` 处理）

2. **第二遍 — 检测 watch 同步**：遍历 `CallExpression`，匹配 `watch(arg, ...)`：
   - 若 `arg` 为 `Identifier 'locale'` → 设置 `hasLocaleWatch = true`，整个文件不报告
   - 若 `arg` 为已收集的 ref 名 → 加入 `watchedTargets`，该 ref 不报告
   - 支持数组形式 `watch([a, b, locale], ...)`

3. **第三遍 — 检测问题赋值**：遍历 `AssignmentExpression`：
   - 左侧必须是 `xxx.value`（`MemberExpression` + 属性 `value` + 非 computed）
   - `xxx` 必须在 `refNames` 集合中且不在 `watchedTargets` 中
   - 右侧通过 `containsTCall()` 判断含 `t()` 或 `$t()` 调用
   - 若赋值所在函数声明了 `t` 形参（工厂函数模式），跳过

### 错误示例
```javascript
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const visible = ref([])

const update = () => {
  // ❌ 切换语言后 visible.value 不会更新
  visible.value = items.map(i => ({ label: t(i.key) }))
}
```

### 正确示例（任一即可）
```javascript
// ✅ 方式 1：watch(locale)
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const visible = ref([])
const update = () => { visible.value = items.map(i => ({ label: t(i.key) })) }

watch(locale, () => { update() })

// ✅ 方式 2：watch(<refName>) 间接同步
watch(visible, () => { /* ... */ })

// ✅ 方式 3：改用 computed 自动响应
const visible = computed(() => items.map(i => ({ label: t(i.key) })))
```

## 边界情况处理

### 1. 工厂函数模式
```javascript
// ✅ 不报告：t 通过参数传入，函数语义上是"拿到 t 后立即调用"
function buildOptions(t) {
  data.value = [{ label: t('common.yes') }]
}
```
原因：t 通过参数传入，调用方负责保证响应式（典型用法是在 setup 中调用并 watch locale 重复调用）。

### 2. 已被 ReactiveChecker 覆盖的场景
```javascript
// ✅ 本检测器不报告：直接初始化 ref(t(...))
const title = ref(t('common.title'))
```
该场景由 `ReactiveChecker` 输出 `ref-with-t` 类型，避免重复告警。

### 3. 非 .value 赋值
```javascript
// ✅ 不报告：data.label 不是 .value
data.label = t('a')
```
当前只检测 `xxx.value =` 模式。

### 4. 跨文件 ref（composable 暴露）
```javascript
// 不检测：x 来自 useXxx 解构，无法跟踪声明
const { x } = useXxx()
x.value = [{ label: t('a') }]
```
当前实现需要在同一 script 中能看到 `ref(...)` 声明。

### 5. 深度对象嵌套赋值
```javascript
// 不检测：x.value.list = ... 是深度赋值
x.value.list = [{ label: t('a') }]
```
当前只检测顶层 `.value =` 赋值。

## 测试用例

### 检出场景
- ✅ `ref([])` + `.value = items.map(i => ({ label: t(i.key) }))`
- ✅ `ref([])` + `.value = list.filter(l => l.label === t('a'))`
- ✅ 多次赋值各产生独立 issue
- ✅ 行号偏移正确

### 不误报场景
- ✅ 存在 `watch(locale, ...)`
- ✅ 存在 `watch(<refName>, ...)`
- ✅ `ref(t('xxx'))` 形式（由 ReactiveChecker 处理）
- ✅ 静态数据赋值 `x.value = [1, 2, 3]`
- ✅ 赋值右侧无 t() `x.value = data`
- ✅ 工厂函数模式 `function f(t) { x.value = t('a') }`
- ✅ 非 .value 赋值 `data.label = t('a')`
- ✅ 无 ref 声明的 script

### 多 ref 独立判断
- ✅ 仅 `watch(a, ...)` 时，未被 watch 的 ref `b` 仍报告

### 边界
- ✅ 解析失败返回空数组

## 实现注意事项

### 1. 复用 containsTCall
工具函数 `containsTCall(node)` 与 `reactiveChecker.ts:9-32` 一致，递归扫描 AST 中是否存在 `t()` 或 `$t()` 调用。当前实现局部复制（避免循环依赖），后续若有更多检测器复用，可提取到 `packages/adapter-vue3/src/utils/ast.ts`。

### 2. 工厂函数检测
```typescript
function functionDeclaresTParam(funcNode): boolean {
  return funcNode.params.some(p => p.type === 'Identifier' && (p.name === 't' || p.name === '$t'))
}
```
赋值表达式判断时，沿 `parentPath` 向上找到最近的 Function 节点检查参数。

### 3. 性能考虑
对每个文件做 3 遍 AST 遍历，但每遍只做轻量判断。文件级别 visitor 一次性收集集合，整体性能良好。

### 4. 后续增强方向（Phase 8.3）
- **computed 间接引用**: `cachedRef.value = computedActions.value`，需要先识别 `computedActions` 是否为含 t() 的 computed
- **深层对象赋值**: `x.value.list = [...]`
- **跨文件 composable 追踪**: 需要项目级符号表

## 与其他检测器的关系

- **ReactiveChecker**: 检测顶层声明阶段的响应式问题（`ref(t())`、含 t() 的静态对象等）
- **CachedRefLocaleChecker**: 检测后续函数体中"赋值阶段"的响应式问题（本检测器）

两者覆盖 ref + t() 的不同生命周期阶段，互补关系。
