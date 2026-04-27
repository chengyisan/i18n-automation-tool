# 经验教训与最佳实践

**国际化自动化工具 - 从 152+ 次提交中总结的规则**

**最后更新**: 2026-04-27

---

基于 `energy_2.2.0_i18n` 分支的实际改造经验（152+ 次提交，5 个应用），总结以下规则和最佳实践。这些模式应固化到工具规则中。

---

## 1. t() 响应式规则

**规则**: `t()` 返回值禁止直接赋给 `ref`/变量，必须用 `computed` 或 `watch(locale)`

**原因**: `t()` 在组件初始化时计算，语言切换后不会更新

**错误示例**:

```javascript
// ❌ 错误：直接赋值给 ref
const title = ref(t('common.title'))

// ❌ 错误：直接赋值给变量
const options = [
  { label: t('common.yes'), value: 1 },
  { label: t('common.no'), value: 0 }
]

// ✅ 正确：使用 computed
const title = computed(() => t('common.title'))

// ✅ 正确：使用 computed 包裹数组
const options = computed(() => [
  { label: t('common.yes'), value: 1 },
  { label: t('common.no'), value: 0 }
])

// ✅ 正确：使用 watch(locale) 更新
const title = ref('')
watch(locale, () => {
  title.value = t('common.title')
}, { immediate: true })
```

---

## 2. locale code 格式

**规则**: 必须使用项目实际注册的 locale code（如 `zh`/`en`），不能混用 `zh-CN`/`en-US`

**原因**: vue-i18n 按 locale code 精确匹配，混用会导致翻译不生效

**错误示例**:

```javascript
// ❌ 错误：使用未注册的 locale code
locale.value = 'zh-CN'  // 项目注册的是 'zh'

// ❌ 错误：在翻译文件中使用错误的 code
// locales/zh-CN/common.json  // 应该是 zh/common.json
```

**正确示例**:

```javascript
// ✅ 正确：使用项目注册的 locale code
locale.value = 'zh'  // 或 'en', 'ar', 'es'

// ✅ 正确：翻译文件路径
// locales/zh/common.json
// locales/en/common.json
```

---

## 3. 静态常量改工厂函数

**规则**: 静态常量改为工厂函数时，必须同步更新所有导入方的函数名和调用方式

**原因**: 导入方仍按旧方式使用会导致运行时错误

**错误示例**:

```javascript
// 定义处：从静态常量改为工厂函数
// ❌ 旧代码
export const STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
]

// ✅ 新代码
export const getStatusOptions = () => [
  { label: t('common.enable'), value: 1 },
  { label: t('common.disable'), value: 0 }
]

// 使用处：忘记更新导入和调用方式
// ❌ 错误：仍按旧方式使用
import { STATUS_OPTIONS } from './constants'
const options = STATUS_OPTIONS  // 运行时报错：STATUS_OPTIONS is not defined
```

**正确示例**:

```javascript
// ✅ 正确：同步更新导入和调用
import { getStatusOptions } from './constants'
const options = computed(() => getStatusOptions())
```

---

## 4. JSX 列配置

**规则**: JSX 中的 `t()` 调用需在调用方用 `computed` 包裹，而非在定义处

**原因**: JSX 列配置通常是静态对象，定义处的 `t()` 不会响应语言切换

**错误示例**:

```javascript
// ❌ 错误：在定义处直接使用 t()
export const getColumns = () => [
  {
    title: t('table.name'),  // 不会响应语言切换
    dataIndex: 'name'
  }
]

// 使用处
const columns = getColumns()  // 静态调用，语言切换后不更新
```

**正确示例**:

```javascript
// ✅ 正确：在调用方用 computed 包裹
export const getColumns = () => [
  {
    title: 'table.name',  // 传递 key 而非翻译结果
    dataIndex: 'name'
  }
]

// 使用处
const columns = computed(() => 
  getColumns().map(col => ({
    ...col,
    title: t(col.title)  // 在 computed 中调用 t()
  }))
)
```

---

## 5. 菜单 key 语义化

**规则**: 用路由 id 做 i18n key 比用中文 name 更稳定

**原因**: 后端改菜单名需同步改翻译文件，用 id 则不受影响

**改造前**:

```javascript
// ❌ 使用中文 name 作为 key
const menuName = t(`menu.${item.name}`)  // item.name = '数据管理'

// locales/zh/menu.json
{
  "数据管理": "数据管理"
}

// locales/en/menu.json
{
  "数据管理": "Data Management"
}

// 问题：后端改 name 为 '数据中心' 后，需同步改所有翻译文件的 key
```

**改造后**:

```javascript
// ✅ 使用路由 id 作为 key
const menuName = t(`menu.${item.id}`)  // item.id = 'data-management'

// locales/zh/menu.json
{
  "data-management": "数据管理"
}

// locales/en/menu.json
{
  "data-management": "Data Management"
}

// 优势：后端改 name 不影响翻译，只需改中文翻译值
```

---

## 6. 翻译质量

**规则**: 机翻后需人工审查

**常见问题**:

1. **中式英语**: 如 "please input" → "enter"
2. **冗余表达**: 如 "please confirm whether to delete" → "delete?"
3. **RTL 拼接错误**: 阿语中 `${name} 的报告` 需改为 `报告 ${name}`

**各语种注意事项**:

| 语种 | 注意事项 |
|------|----------|
| 英语 | 避免中式英语，精简表达，去掉多余的 please/whether |
| 西班牙语 | 去掉波浪号（¿¡）和多余感叹号，修正语法错误 |
| 阿拉伯语 | RTL 拼接顺序、避免冗余表达、注意性别和数的一致性 |

---

## 7. 不可转换的中文

**规则**: 与后端交互的 value 值不能转换、图片中的中文需替换为多语言图片、SVG 中的中文需提取为 i18n

**详细说明**:

### 7.1 后端交互的 value 值

```javascript
// ❌ 错误：转换后端返回的中文 value
const statusMap = {
  '启用': t('common.enable'),
  '禁用': t('common.disable')
}

// ✅ 正确：保留后端 value，只转换显示文本
const getStatusLabel = (value) => {
  const map = {
    '启用': 'common.enable',
    '禁用': 'common.disable'
  }
  return t(map[value] || value)
}
```

### 7.2 图片中的中文

```javascript
// ❌ 错误：图片中有中文，未处理
<img src="@/assets/banner-zh.png" />

// ✅ 正确：根据语言切换图片
<img :src="require(`@/assets/banner-${locale}.png`)" />
```

### 7.3 SVG 中的中文

```vue
<!-- ❌ 错误：SVG 中硬编码中文 -->
<svg>
  <text>数据统计</text>
</svg>

<!-- ✅ 正确：提取为 i18n -->
<svg>
  <text>{{ t('chart.dataStatistics') }}</text>
</svg>
```

---

## 8. 公共翻译统一管理

**规则**: 跨模块重复出现的文案应提前识别并合并到 `shared-i18n`

**原因**: 避免重复定义，降低维护成本

**操作流程**:

1. **识别重复文案**: 使用工具扫描所有应用的翻译文件，找出重复的 key-value
2. **提取到 shared-i18n**: 将重复文案移到 `packages/shared-i18n/locales/`
3. **更新引用**: 各应用改为引用 shared-i18n 的 key

**示例**:

```javascript
// 改造前：每个应用都定义
// apps/main/locales/zh/common.json
{
  "confirm": "确认",
  "cancel": "取消"
}

// apps/report/locales/zh/common.json
{
  "confirm": "确认",
  "cancel": "取消"
}

// 改造后：统一管理
// packages/shared-i18n/locales/zh/common.json
{
  "confirm": "确认",
  "cancel": "取消"
}

// 各应用引用
import { t } from 'shared-i18n'
t('common.confirm')
```

---

## 9. 语种特殊化处理

**规则**: 阿语等 RTL 语言需单独处理布局镜像、文字方向、图标翻转等

**原因**: 不能仅靠翻译文案，需要 CSS 和组件层面的适配

**需要处理的方面**:

| 方面 | 处理方式 |
|------|----------|
| 布局方向 | 添加 `dir="rtl"` 属性，或使用 CSS `direction: rtl` |
| 文字对齐 | 左对齐改为右对齐 `text-align: right` |
| 图标翻转 | 箭头、返回等图标需水平翻转 `transform: scaleX(-1)` |
| 边距调整 | `margin-left` 改为 `margin-right`，或使用逻辑属性 `margin-inline-start` |
| 表格列顺序 | 从右到左排列 |
| 表单布局 | label 在右侧，input 在左侧 |

**示例**:

```vue
<template>
  <div :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <el-button>
      <el-icon :style="{ transform: locale === 'ar' ? 'scaleX(-1)' : 'none' }">
        <ArrowLeft />
      </el-icon>
      {{ t('common.back') }}
    </el-button>
  </div>
</template>

<style scoped>
.container {
  /* 使用逻辑属性，自动适配 RTL */
  margin-inline-start: 20px;
  padding-inline-end: 10px;
}
</style>
```

---

## 工具规则映射

将以上 9 条经验教训映射到工具的检测规则：

| 经验教训 | 工具检测规则名称 | 检测方式 | 严重级别 |
|----------|------------------|----------|----------|
| 1. t() 响应式规则 | `reactive-t-call` | AST 分析：检测 `ref(t(...))` 和变量直接赋值 `t(...)` | error |
| 2. locale code 格式 | `locale-code-format` | 正则匹配：检测 `locale.value = 'zh-CN'` 等非注册 code | error |
| 3. 静态常量改工厂函数 | `factory-function-sync` | 跨文件分析：检测导出改为函数但导入未更新 | error |
| 4. JSX 列配置 | `jsx-column-reactive` | AST 分析：检测列配置中的 `t()` 调用未被 `computed` 包裹 | warning |
| 5. 菜单 key 语义化 | `menu-key-semantic` | 正则匹配：检测 `t(\`menu.${item.name}\`)` 使用中文 name | info |
| 6. 翻译质量 | `translation-quality` | 规则引擎：检测中式英语、冗余表达、RTL 拼接错误 | warning |
| 7. 不可转换的中文 | `non-translatable-chinese` | AST + 正则：检测后端 value、图片路径、SVG 中的中文 | warning |
| 8. 公共翻译统一管理 | `shared-i18n-dedup` | 跨文件分析：检测重复的 key-value，建议提取到 shared-i18n | info |
| 9. 语种特殊化处理 | `rtl-layout-check` | 模板分析：检测阿语等 RTL 语言缺少 `dir` 属性或 CSS 适配 | warning |

---

## 相关文档

- [README.md](./README.md) - 工具概述和快速开始
- [technical-design.md](./technical-design.md) - 技术设计和架构
- [special-cases.md](./special-cases.md) - 特殊场景处理指南
