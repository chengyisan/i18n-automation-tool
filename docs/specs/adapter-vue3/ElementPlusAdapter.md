# ElementPlusAdapter 规格文档

## 功能描述

Element Plus 国际化适配器，检测 Element Plus 的 locale 配置、ElConfigProvider 配置，以及组件中的硬编码中文。

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容
- `filePath: string` — 文件路径

**输出**: `ElementPlusIssue[]` 接口
```typescript
interface ElementPlusIssue {
  type: 'missing-config-provider' | 'missing-locale-import' | 'hardcoded-prop'
  filePath: string
  line: number
  message: string
  suggestion: string
}
```

## 核心检测规则

### 规则 1: missing-config-provider
检测是否缺少 `ElConfigProvider` 配置。

```vue
<!-- ❌ 错误 -->
<template>
  <ElButton>按钮</ElButton>
</template>

<!-- ✅ 建议 -->
<template>
  <ElConfigProvider :locale="locale">
    <ElButton>{{ t('common.button') }}</ElButton>
  </ElConfigProvider>
</template>
```

### 规则 2: missing-locale-import
检测是否缺少 Element Plus locale 导入。

```javascript
// ❌ 错误
import { ElConfigProvider } from 'element-plus'

// ✅ 建议
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
```

### 规则 3: hardcoded-prop
检测 Element Plus 组件中的硬编码中文属性。

```vue
<!-- ❌ 错误 -->
<ElInput placeholder="请输入" />
<ElButton>确认</ElButton>

<!-- ✅ 建议 -->
<ElInput :placeholder="t('common.pleaseInput')" />
<ElButton>{{ t('common.confirm') }}</ElButton>
```

## 核心算法/流程

1. 使用 `@vue/compiler-sfc` 解析 Vue SFC
2. 检查 template 中是否有 `ElConfigProvider` 组件
3. 检查 script 中是否导入了 Element Plus locale
4. 遍历 template 中的 Element Plus 组件，检查属性值是否包含中文

## 边界情况处理

- 已经使用 t() 的属性不应报告
- 非 Element Plus 组件不应检查
- 动态绑定的属性（`:placeholder`）需要检查绑定值
- ElConfigProvider 可能在父组件中配置

## 测试用例

1. 检测缺少 ElConfigProvider
2. 检测缺少 locale 导入
3. 检测 placeholder 中的硬编码中文
4. 检测按钮文本中的硬编码中文
5. 不误报已使用 t() 的属性
6. 不误报非 Element Plus 组件

## 实现注意事项

- Element Plus 组件名可能是 `ElButton` 或 `el-button` 格式
- 需要识别常见的 Element Plus 组件（ElButton, ElInput, ElSelect 等）
- locale 导入路径可能是 `.mjs` 或 `.js`
- 建议信息应该包含具体的修复方案
