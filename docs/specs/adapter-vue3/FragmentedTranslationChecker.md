# FragmentedTranslationChecker 规格文档

## 功能描述

检测碎片化翻译拼接问题 — 将完整句子拆分成多个 t() 调用然后拼接。这种做法会导致：
- 各语种语法不通（词序不同）
- 无法准确翻译（失去完整语境）
- 阅读困难（翻译人员看不到完整句子）

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容
- `filePath: string` — 文件路径

**输出**: `ReactiveIssue[]` 接口
```typescript
interface ReactiveIssue {
  type: 'fragmented-translation'
  filePath: string
  line: number
  column: number
  code: string
  suggestion: string
}
```

## 核心检测规则

### 规则 1: Template 中的碎片化拼接

检测 template 中多个 `{{ t() }}` 或 `{{ $t() }}` 表达式拼接，中间只有空格或变量。

```vue
<!-- ❌ 错误：拆分成多个 t() -->
<div>{{ t('prefix') }} {{ count }} {{ t('suffix') }}</div>
<div>{{ $t('hello') }}{{ userName }}{{ $t('world') }}</div>

<!-- ✅ 正确：使用插值变量 -->
<div>{{ t('message', { count }) }}</div>
<div>{{ t('greeting', { name: userName }) }}</div>
```

**检测逻辑**:
- 使用正则匹配包含多个 t() 调用的插值表达式序列
- 排除中间有实际分隔符文本的情况（如：`{{ t('a') }} - {{ t('b') }}`）

### 规则 2: Script 中的碎片化拼接

检测 script/script setup 中使用 `+` 运算符拼接多个 t() 调用。

```javascript
// ❌ 错误：字符串拼接
const message = t('prefix') + userName + t('suffix')
const msg = t('a') + ' ' + t('b')

// ✅ 正确：使用插值变量
const message = t('message', { name: userName })
const msg = t('combined', { a, b })
```

**检测逻辑**:
- 使用 @babel/traverse 遍历 AST
- 查找 BinaryExpression 节点（+ 运算符）
- 递归收集所有操作数
- 统计 t() 调用数量，≥2 则报告问题

## 边界情况处理

### 1. 正确的插值变量模式
不应误报以下正确用法：
```javascript
// ✅ 正确：使用插值变量传参
const message = t('greeting', { name: userName })
const title = t('pageTitle', { count: total })
```

### 2. 单个 t() 调用
不应误报：
```javascript
// ✅ 正确：单个 t() 调用
const title = t('common.title')
const greeting = 'Hello' + userName // 非 t() 拼接
```

### 3. 有分隔符文本的情况
Template 中如果有明显的分隔符，可能是合理的布局：
```vue
<!-- ✅ 可能合理：有分隔符 -->
<div>{{ t('title') }} - {{ t('subtitle') }}</div>
```
当前实现会跳过这种情况。

## 测试用例

### Template 检测
- ✅ 检测 `{{ t('prefix') }} {{ count }} {{ t('suffix') }}`
- ✅ 检测 `{{ $t('a') }}{{ userName }}{{ $t('b') }}`
- ✅ 检测 `{{ t('part1') }}{{ t('part2') }}`
- ✅ 不误报有分隔符的情况：`{{ t('title') }} - {{ t('subtitle') }}`
- ✅ 不误报单个 t()

### Script 检测
- ✅ 检测 `t('prefix') + userName + t('suffix')`
- ✅ 检测 `t('a') + ' ' + t('b')`
- ✅ 检测 `$t('hello') + this.name + $t('world')`
- ✅ 不误报插值变量：`t('message', { name: userName })`
- ✅ 不误报单个 t()：`const title = t('common.title')`
- ✅ 检测复杂多重拼接：`t('start') + a + t('middle') + b + t('end')`

### 边界情况
- ✅ 无 script 块返回空数组
- ✅ 无 template 块正常检测 script
- ✅ 同时检测 template 和 script
- ✅ 正确计算行号

## 使用示例

```typescript
import { FragmentedTranslationChecker } from '@i18n-tool/adapter-vue3'

const checker = new FragmentedTranslationChecker()

const vueSource = `
<template>
  <div>{{ t('hello') }} {{ name }} {{ t('world') }}</div>
</template>

<script setup>
const msg = t('start') + ' ' + t('end')
</script>
`

const issues = checker.check(vueSource, 'Example.vue')

issues.forEach(issue => {
  console.log(`${issue.filePath}:${issue.line} - ${issue.type}`)
  console.log(`代码: ${issue.code}`)
  console.log(`建议: ${issue.suggestion}`)
})
```

## 实现注意事项

### 1. Template 正则检测
- 使用 `matchAll` 全局匹配所有碎片化拼接
- 计算行号时需考虑 template 块的起始行
- 排除中间有分隔符文本的情况

### 2. Script AST 分析
- 使用 @babel/parser 解析 TypeScript/JSX
- 递归收集 BinaryExpression 的所有操作数
- 注意 this 绑定问题（使用 `const self = this`）

### 3. 性能考虑
- 正则匹配在小文件中性能良好
- AST 遍历使用 visitor 模式，只遍历一次
- 代码片段长度限制为 100 字符，避免输出过长

### 4. ESM 兼容性
- @babel/traverse 默认导出处理：`const traverse = (_traverse as any).default || _traverse`
- 所有导入路径使用 `.js` 扩展名

## 与其他检测器的关系

- **ReactiveChecker**: 检测响应式问题（t() 调用不响应语言切换）
- **TemplateConcatChecker**: 检测相邻 t() 缺少空格
- **FragmentedTranslationChecker**: 检测碎片化翻译拼接（本检测器）

这三个检测器互补，共同保证 i18n 翻译的正确性和可维护性。
