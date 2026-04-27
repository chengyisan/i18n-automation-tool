# ChineseScanner 规格说明

## 功能描述

硬编码中文扫描器，负责扫描源代码文件中的硬编码中文字符串，返回位置信息和建议的 i18n key。框架无关，只处理纯文本内容。

## 核心职责

1. 逐行扫描文件内容，识别硬编码中文字符串
2. 区分上下文（template / script / style）
3. 排除不应扫描的内容（注释、URL、已有 i18n 调用等）
4. 为每个匹配项生成位置信息（行号、列号）
5. 支持批量扫描多个文件

## 输入输出

### 输入

```typescript
interface ScanOptions {
  /** 文件内容 */
  content: string
  /** 文件路径（用于报告和 key 生成） */
  filePath: string
  /** 排除模式 */
  excludePatterns?: ExcludePattern[]
}
```

### 输出

```typescript
interface ScanResult {
  filePath: string
  hardcodedStrings: HardcodedString[]
  untranslatables: UntranslatableItem[]
  duplicates: DuplicateKey[]
}
```

## 中文匹配规则

### 主正则

```typescript
// 匹配包含中文字符的字符串
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/
// 匹配完整的中文文本片段（含中文标点、数字、空格混合）
const CHINESE_TEXT_REGEX = /[\u4e00-\u9fa5][\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\d\s]*/g
```

### 字符串提取

从源代码中提取字符串字面量，再判断是否包含中文：

```typescript
// 单引号字符串
const SINGLE_QUOTE_STRING = /'([^'\\]|\\.)*'/g
// 双引号字符串
const DOUBLE_QUOTE_STRING = /"([^"\\]|\\.)*"/g
// 模板字符串
const TEMPLATE_STRING = /`([^`\\]|\\.)*`/g
```

## 排除规则

### 必须排除的内容

| 类别 | 模式 | 示例 |
|------|------|------|
| 单行注释 | `// ...` | `// 这是注释` |
| 多行注释 | `/* ... */` | `/* 中文注释 */` |
| HTML 注释 | `<!-- ... -->` | `<!-- 中文注释 -->` |
| 已有 i18n 调用 | `t('...')` / `$t('...')` | `{{ $t('common.title') }}` |
| import 语句 | `import ... from '...'` | `import { ref } from 'vue'` |
| URL | `http(s)://...` | `https://example.com/中文路径` |
| console 语句 | `console.log/info/warn/error(...)` | `console.log('调试信息')` |
| 正则表达式 | `/pattern/flags` | `/[\u4e00-\u9fa5]/g` |

### 可配置排除

通过 `I18nToolConfig.exclude` 配置额外排除的文件 glob 模式。

## 上下文识别

扫描器需要识别中文所在的上下文，以便后续替换时使用正确的语法：

### template 上下文

```html
<!-- 纯文本节点 -->
<span>中文文本</span>

<!-- 属性值 -->
<el-input placeholder="请输入" />

<!-- 动态绑定的字符串 -->
<el-input :placeholder="'请输入'" />

<!-- 插值表达式中的字符串 -->
<span>{{ '中文' + variable }}</span>
```

### script 上下文

```javascript
// 变量赋值
const title = '标题'

// 函数参数
ElMessage.success('操作成功')

// 对象属性值
const config = { label: '名称', placeholder: '请输入' }

// 数组元素
const list = ['选项一', '选项二']

// 三元表达式
const text = isActive ? '激活' : '未激活'
```

### style 上下文

```css
/* content 属性 */
.required::before { content: '必填'; }
```

## 核心方法

### `scanContent(options: ScanOptions): ScanResult`

扫描单个文件内容。

**流程**：
1. 预处理：移除注释，标记已有 i18n 调用位置
2. 逐行扫描：提取字符串字面量
3. 过滤：对每个字符串应用排除规则
4. 定位：计算行号和列号
5. 分类：判断上下文（template / script / style）
6. 返回结果

### `scanFiles(filePaths: string[], config: I18nToolConfig): ScanResult[]`

批量扫描多个文件。

**流程**：
1. 过滤排除的文件路径
2. 并行读取文件内容
3. 对每个文件调用 `scanContent`
4. 汇总结果

### `isExcluded(text: string, line: string, context: ExcludeContext): boolean`

判断一个中文字符串是否应该被排除。

**参数**：
- `text` - 匹配到的中文文本
- `line` - 所在行的完整内容
- `context` - 排除上下文（包含注释范围、import 行等信息）

## 预处理阶段

### 注释范围标记

扫描前先标记所有注释的行范围，避免误报：

```typescript
interface CommentRange {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  type: 'line' | 'block' | 'html'
}
```

### i18n 调用标记

标记已有的 i18n 调用位置，避免重复扫描：

```typescript
// 匹配 t('...') / $t('...') / i18n.t('...')
const I18N_CALL_REGEX = /(?:\$t|(?:i18n\.)?t)\s*\(\s*['"`]/g
```

## 使用示例

```typescript
import { ChineseScanner } from '@i18n-tool/core'

const scanner = new ChineseScanner(config)

// 扫描单个文件
const result = scanner.scanContent({
  content: fileContent,
  filePath: 'src/views/Home.vue',
})

// 批量扫描
const results = await scanner.scanFiles(
  ['src/views/Home.vue', 'src/utils/format.ts'],
  config,
)

// 输出示例
// {
//   filePath: 'src/views/Home.vue',
//   hardcodedStrings: [
//     {
//       text: '请输入',
//       line: 12,
//       column: 25,
//       context: 'template',
//       suggestedKey: 'home.pleaseInput'
//     }
//   ],
//   untranslatables: [],
//   duplicates: []
// }
```

## 测试用例

### 1. 基本中文检测

```
输入: `const title = '标题'`
期望: 检测到 '标题'，context = 'script'
```

### 2. template 中的中文

```
输入: `<span>中文文本</span>`
期望: 检测到 '中文文本'，context = 'template'
```

### 3. 属性中的中文

```
输入: `<el-input placeholder="请输入" />`
期望: 检测到 '请输入'，context = 'template'
```

### 4. 排除注释

```
输入: `// 这是注释`
期望: 不检测
```

### 5. 排除已有 i18n 调用

```
输入: `{{ $t('common.title') }}`
期望: 不检测
```

### 6. 排除 console

```
输入: `console.log('调试信息')`
期望: 不检测
```

### 7. 排除 URL

```
输入: `const url = 'https://example.com/中文路径'`
期望: 不检测
```

### 8. 对象属性值

```
输入: `const config = { label: '名称', value: 'name' }`
期望: 检测到 '名称'，不检测 'name'
```

### 9. 模板字符串

```
输入: `const msg = \`欢迎 ${name}\``
期望: 检测到 '欢迎 '
```

### 10. 多行注释中的中文

```
输入:
  /* 
   * 这是多行注释
   */
期望: 不检测
```

### 11. HTML 注释

```
输入: `<!-- 这是 HTML 注释 -->`
期望: 不检测
```

### 12. 动态绑定属性

```
输入: `<el-input :placeholder="'请输入关键词'" />`
期望: 检测到 '请输入关键词'，context = 'template'
```

### 13. ElMessage 等函数调用

```
输入: `ElMessage.success('操作成功')`
期望: 检测到 '操作成功'，context = 'script'
```

### 14. 三元表达式

```
输入: `const text = isActive ? '激活' : '未激活'`
期望: 检测到 '激活' 和 '未激活'
```

### 15. 空文件

```
输入: ``
期望: 返回空结果
```

### 16. 无中文文件

```
输入: `const title = 'Hello World'`
期望: 返回空结果
```

## 实现注意事项

1. **准确性优先**：宁可漏报，不要误报。误报会降低用户信任度
2. **性能**：大文件（>10000 行）需要考虑性能，避免正则回溯
3. **编码**：假设输入为 UTF-8 编码
4. **行号从 1 开始**：与编辑器行号一致
5. **框架无关**：core 包的 ChineseScanner 只做文本级别的扫描，不解析 AST。AST 级别的精确解析由 adapter-vue3 负责
6. **上下文判断**：对于 `.vue` 文件，通过简单的 `<template>`/`<script>`/`<style>` 标签位置判断上下文，精确的 SFC 解析交给 adapter 层

## 依赖

- 无外部依赖（纯正则 + 字符串处理）
