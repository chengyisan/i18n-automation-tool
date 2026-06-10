# MaxlengthChecker 规格文档

## 功能描述

检测 Vue SFC `<template>` 中 Element Plus 表单组件（`el-input` / `el-textarea` / `el-input-number`）上
固定数值字面量的 `maxlength` 属性（如 `maxlength="20"`），提示按 locale 动态调整。

国际化场景下，长语种（英文等）通常比中文长 30-50%，固定的字符上限会限制其他语言用户的正常输入。

对应 `docs/lessons-learned.md` **规则 15（表单 maxlength 动态适配）**。

### 典型问题

```vue
<!-- ❌ 固定 20 字符上限，英文用户可能不够用 -->
<el-input v-model="form.name" maxlength="20" />
```

```vue
<!-- ✅ 按 locale 适配 -->
<el-input v-model="form.name" :maxlength="dynamicMaxlength" />
<script setup>
const dynamicMaxlength = computed(() =>
  locale.value === 'zh-CN' ? 20 : 60
)
</script>
```

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容
- `filePath: string` — 文件路径

**输出**: `MaxlengthIssue[]`

```typescript
interface MaxlengthIssue {
  type: 'maxlength-fixed'
  filePath: string
  line: number
  code: string
  currentValue: number
  suggestion: string
}
```

## 核心检测规则

### 1. SFC 解析

通过 `@vue/compiler-sfc` 的 `parse()` 提取 `descriptor.template`：
- 缺失 `template` 块 → 返回空数组
- 解析抛错 → 捕获后返回空数组

### 2. 组件 + 固定 maxlength 匹配

仅检测三类 Element Plus 表单组件：

```typescript
private readonly patterns: RegExp[] = [
  /<el-input\s[^>]*?\bmaxlength\s*=\s*"(\d+)"/g,
  /<el-textarea\s[^>]*?\bmaxlength\s*=\s*"(\d+)"/g,
  /<el-input-number\s[^>]*?\bmaxlength\s*=\s*"(\d+)"/g,
]
```

捕获组 1 为数值字符串，转 `Number` 后作为 `currentValue`。

### 3. 排除动态绑定

正则匹配 `maxlength="..."` 时也可能命中 `:maxlength="..."` 的子串。
通过检查匹配文本中 `maxlength` 前一个字符是否为冒号来排除动态绑定：

```typescript
const maxlengthIdx = match[0].lastIndexOf('maxlength')
const charBefore = match[0][maxlengthIdx - 1]
if (charBefore === ':') continue
```

动态绑定（`:maxlength="20"` 或 `:maxlength="dynamicLen"`）无法静态判断是否已按 locale 适配，因此一律跳过。

### 4. 阈值过滤

```typescript
private readonly threshold = 50
if (currentValue > this.threshold) continue
```

`maxlength > 50` 视为开发者已为多语言预留余量，不报告。
**边界值 `maxlength="50"` 报告**（`>` 而非 `>=`）。

### 5. 行号计算

```typescript
const beforeMatch = templateContent.substring(0, match.index)
const lineNumber = startLine + (beforeMatch.match(/\n/g) || []).length
```

`startLine` 取自 `descriptor.template.loc.start.line`。

## 边界情况处理

| 场景 | 处理 | 原因 |
|------|------|------|
| `:maxlength="20"` | 不报告 | 动态绑定，无法静态判断是否已适配 |
| `:maxlength="dynamicLen"` | 不报告 | 动态变量 |
| `maxlength="100"`（> 50） | 不报告 | 视为已预留余量 |
| `maxlength="50"`（= 50） | 报告 | 边界值含入阈值内 |
| 原生 `<input maxlength="20">` | 不报告 | 业务以 Element Plus 为主，原生留待后续 |
| 无 maxlength 的 `el-input` | 不报告 | 无固定上限问题 |
| 解析失败 / 无 template | 返回空数组 | 保守降级 |

## 测试用例

### 检出场景
- ✅ `<el-input maxlength="20" />`
- ✅ `<el-textarea maxlength="50" />`
- ✅ `<el-input-number maxlength="10" />`
- ✅ 同一文件多个固定 maxlength 全部检测
- ✅ 行号偏移正确（`<template>` 在 `<script>` 之后）
- ✅ 边界值 `maxlength="50"` 报告（等于阈值）

### 不误报场景
- ✅ `<el-input :maxlength="20" />`（动态绑定）
- ✅ `<el-input :maxlength="dynamicLen" />`（动态变量）
- ✅ `<el-input maxlength="100" />`（超过阈值）
- ✅ `<input maxlength="20" />`（原生标签）
- ✅ 无 maxlength 的 `<el-input placeholder="请输入" />`

### 边界
- ✅ 解析失败返回空数组
- ✅ 无 `<template>` 块返回空数组

## 实现注意事项

### 1. 冒号前缀排除
正则 `\bmaxlength\s*=\s*"(\d+)"` 中 `\b` 是单词边界，`:maxlength` 里 `:` 与 `m` 之间也构成边界，因此该正则会匹配 `:maxlength="20"` 的 `maxlength="20"` 部分。必须在匹配后显式检查前一字符是否为 `:` 来排除动态绑定。

### 2. 阈值取值依据
阈值 50 来自经验：中文表单常见 maxlength 在 10-50 区间，这些值在长语种下风险最高；> 50 通常是描述类长文本字段，开发者一般已留足空间。阈值可后续按实际项目数据调整。

### 3. 仅覆盖 Element Plus
本期仅检测 `el-input` / `el-textarea` / `el-input-number`，原生 `<input maxlength>` 不检测。业务项目以 Element Plus 为主，原生标签覆盖留给 Phase 8.4。

### 4. 正则共享对象的 lastIndex 重置
与 `ImageI18nChecker` 同理，每次循环前 `pattern.lastIndex = 0`。

## 与其他检测器的关系

- **TemplateConcatChecker**: 检测模板字符串拼接（template 级语义问题）
- **ImageI18nChecker**: 检测静态图片资源未多语言化（template 级资源问题）
- **MaxlengthChecker**: 检测表单 maxlength 未按语种适配（template 级 UI 问题）— 本检测器

三者使用相同的"`descriptor.template.content` + 正则"骨架，互补覆盖 template 层的国际化问题。MaxlengthChecker 关注的是国际化后的 **UI 容量适配** 维度，与 CSS 固定宽度检测（core 包）形成呼应。
