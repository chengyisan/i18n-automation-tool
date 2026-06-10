# ImageI18nChecker 规格文档

## 功能描述

检测 Vue SFC `<template>` 中静态 `<img>` 引用的图片资源路径是否含中文（CJK）字符。
图片路径含中文意味着该资源是中文专用版本，国际化场景下应按 locale 动态切换为对应语言版本。

对应 `docs/lessons-learned.md` **规则 14（图片资源多语言切换）**。

### 典型问题

```vue
<!-- ❌ 中文专用图片，国际化时其他语言用户仍会看到中文图 -->
<img src="@/assets/欢迎.png" />
<img :src="require('@/assets/产品介绍.svg')" />
```

```vue
<!-- ✅ 按 locale 切换 -->
<img :src="bannerImg" />
<script setup>
const bannerImg = computed(() =>
  locale.value === 'zh-CN'
    ? require('@/assets/欢迎.png')
    : require('@/assets/欢迎_en.png')
)
</script>
```

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容
- `filePath: string` — 文件路径

**输出**: `ImageI18nIssue[]`

```typescript
interface ImageI18nIssue {
  type: 'image-i18n-missing'
  filePath: string
  line: number
  code: string
  suggestion: string
}
```

## 核心检测规则

### 1. SFC 解析

通过 `@vue/compiler-sfc` 的 `parse()` 提取 `descriptor.template`：
- 缺失 `template` 块（如纯 JS/TS 文件）→ 返回空数组
- 解析抛错 → 捕获后返回空数组（保守降级）

### 2. 三类 `<img>` src 提取

按优先级匹配以下三种形式（同一 `<img>` 只命中一次）：

| 优先级 | 形式 | 正则 |
|--------|------|------|
| 1 | `:src="require('xxx')"` | `/<img\s[^>]*?:src\s*=\s*"require\(\s*['"]([^'"]+)['"]\s*\)"/g` |
| 2 | `:src="'xxx'"`（字面量绑定） | `/<img\s[^>]*?:src\s*=\s*"\s*'([^']+)'\s*"/g` |
| 3 | `src="xxx"`（普通字符串） | `/<img\s[^>]*?\bsrc\s*=\s*"([^"]+)"/g` |

**为什么按优先级**：`require('@/x.png')` 形式的字符串中也含 `src="..."` 子串，若先用普通 src 正则会被误吃。通过 `reportedRanges` 跟踪每次匹配的字符范围，后续 pattern 命中已覆盖区间时跳过。

### 3. 含中文判定

用 CJK Unified Ideographs 范围正则：
```typescript
private readonly cjkPattern = /[\u4e00-\u9fff]/
```

未匹配（不含中文）→ 不报告。

### 4. 语言后缀豁免

文件名末尾已包含明确的语言标识则视为已做多语言，跳过报告：

```typescript
private readonly localeSuffixPattern =
  /[_-](zh|en|cn|us|ar|ja|ko|fr|de|es|ru|pt|it)(?:[-_][a-zA-Z]+)?\.[a-zA-Z]+$/
```

覆盖：`_zh.png` / `_en.svg` / `-en.jpg` / `_zh-CN.png` / `_en_US.png`。

### 5. 行号计算

```typescript
const beforeMatch = templateContent.substring(0, match.index)
const lineNumber = startLine + (beforeMatch.match(/\n/g) || []).length
```

`startLine` 取自 `descriptor.template.loc.start.line`，确保 SFC 中 `<script>` 在前、`<template>` 在后的情况下行号正确。

## 边界情况处理

| 场景 | 处理 | 原因 |
|------|------|------|
| 动态变量 `:src="bannerImg"` | 不报告 | 变量值无法静态判断是否含中文 |
| 函数返回值 `:src="getImage('x')"` | 不报告 | 跨语句静态分析复杂 |
| `import` 引入的图片模块 | 不报告 | 跨语句关联追踪本期不实现 |
| 文件名带 `_zh` / `_en` 等后缀 | 不报告 | 视为已多语言 |
| 同一 `<img>` 多正则匹配 | 仅报告一次 | `reportedRanges` 去重 |
| 解析失败 / 无 template | 返回空数组 | 保守降级 |

## 测试用例

### 检出场景
- ✅ `<img src="@/assets/欢迎.png" />`
- ✅ `<img :src="require('@/assets/产品介绍.svg')" />`
- ✅ `<img :src="'@/assets/标题图.jpg'" />`
- ✅ 同一文件多个含中文图片全部检测
- ✅ 行号偏移正确（`<template>` 在 `<script>` 之后）

### 不误报场景
- ✅ `<img src="@/assets/banner.png" />`（无中文）
- ✅ `<img src="@/assets/欢迎_zh.png" />`（带 `_zh` 语言后缀）
- ✅ `<img src="@/assets/产品_en.png" />`（带 `_en` 语言后缀）
- ✅ `<img :src="bannerImg" />`（动态变量）
- ✅ `<img :src="getImage('any')" />`（函数调用）
- ✅ `<img :src="require('@/assets/欢迎.png')" />` 不会被普通 `src` 模式重复匹配

### 边界
- ✅ 解析失败返回空数组
- ✅ 无 `<template>` 块返回空数组

## 实现注意事项

### 1. 正则共享对象的 lastIndex 重置
`patterns` 数组在实例上长期持有，多次调用 `check()` 必须在每次循环前 `pattern.lastIndex = 0`，否则 `matchAll` 行为异常。

### 2. 重复报告防护
仅按正则优先级排序不够（不同 pattern 可能匹配同一 `<img>` 不同子串）。本实现用 `reportedRanges: [start, end][]` 跟踪已报告区间，后续 pattern 完全落入已有区间则跳过。

### 3. 不展开 import / require 跨语句追踪
形如：
```vue
<script setup>
import banner from '@/assets/欢迎.png'
</script>
<template>
  <img :src="banner" />
</template>
```
当前不识别。原因：跨语句静态分析显著增加实现成本，且实际改造中通常会顺手把 `import` 也替换掉，工具漏报损失可控。该方向留给 Phase 8.4 增强。

### 4. 不做 OCR
图片中嵌入的中文文字（图片本身是英文文件名但内容含中文）不在本检测器职责范围内。OCR 检测基础设施成本与误报率均高，不在工具自动化范围内，需开发者人工筛查。

## 与其他检测器的关系

- **TemplateConcatChecker**: 检测 `{{ t('a') }}{{ t('b') }}` 拼接（template 级语义问题）
- **ImageI18nChecker**: 检测 template 中静态图片资源未多语言化（template 级资源问题）— 本检测器
- **MaxlengthChecker**: 检测 template 中表单 maxlength 未按语种适配（template 级 UI 问题）

三者均使用相同的"`descriptor.template.content` + 正则"骨架，互补覆盖 template 层不同维度的国际化问题。
