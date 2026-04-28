# ReactiveChecker 规格文档

## 功能描述

检测 Vue 3 组件中 t() 调用的响应式问题。基于 152+ 次实际 i18n 改造提交的经验教训，识别会导致语言切换后文本不更新的代码模式。

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容（或 script 部分内容）
- `filePath: string` — 文件路径

**输出**: `ReactiveIssue[]` 接口
```typescript
interface ReactiveIssue {
  type: 'ref-with-t' | 'static-object-with-t' | 'top-level-t-assignment'
  filePath: string
  line: number
  column: number
  code: string
  suggestion: string
}
```

## 核心检测规则

### 规则 1: ref-with-t
检测 `ref(t(...))` 模式。ref 只在初始化时求值一次，语言切换后不会更新。

```javascript
// ❌ 错误
const title = ref(t('common.title'))

// ✅ 建议
const title = computed(() => t('common.title'))
```

### 规则 2: static-object-with-t
检测静态对象/数组中的 t() 调用。对象字面量在声明时求值，语言切换后不会更新。

```javascript
// ❌ 错误
const options = [{ label: t('common.yes'), value: 1 }]
const config = { title: t('common.title') }

// ✅ 建议
const options = computed(() => [{ label: t('common.yes'), value: 1 }])
```

### 规则 3: top-level-t-assignment
检测顶层 const/let 直接赋值 t() 的模式。

```javascript
// ❌ 错误
const title = t('common.title')
let message = t('common.message')

// ✅ 建议
const title = computed(() => t('common.title'))
```

## 核心算法/流程

1. 使用 `@babel/parser` 解析 script 内容为 AST
2. 使用 `@babel/traverse` 遍历 AST
3. 对每个 `VariableDeclaration` 节点检查：
   - init 是否为 `CallExpression` 且 callee 为 'ref'，参数包含 t() 调用
   - init 是否为 `ArrayExpression`/`ObjectExpression` 且内部包含 t() 调用
   - init 是否为 `CallExpression` 且 callee 为 't' 或 '$t'

## 边界情况处理

- `computed(() => t(...))` 不应报告（已经是正确写法）
- watch 回调中的 t() 不应报告
- 函数内部的 t() 不应报告（只检测顶层声明）
- `reactive({})` 中的 t() 也应报告
- 非 script setup 的 Options API 中的 data() 返回值

## 测试用例

1. 检测 `ref(t('key'))` 模式
2. 检测静态数组中的 t() 调用
3. 检测静态对象中的 t() 调用
4. 检测顶层 `const = t('key')` 赋值
5. 不误报 `computed(() => t('key'))`
6. 不误报函数内部的 t() 调用
7. 检测 reactive 中的 t() 调用
8. 无问题时返回空数组

## 实现注意事项

- 需要正确处理 script setup 和普通 script 两种模式
- AST 遍历时注意作用域（只检测顶层声明）
- t() 和 $t() 都需要检测
- 行号需要加上 script 块在 SFC 中的偏移量
- 建议信息应该具体可操作
