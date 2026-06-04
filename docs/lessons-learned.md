# 经验教训与最佳实践

**国际化自动化工具 - 从 180+ 次提交中总结的规则**

**最后更新**: 2026-06-04

---

基于实际 i18n 改造项目的经验（180+ 次提交，5 个应用），总结以下规则和最佳实践。这些模式应固化到工具规则中。

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
| 西班牙语 | 去掉波浪号（¿¡）和多余感叹号，修正动词单复数不匹配，修正拼接语法错误 |
| 阿拉伯语 | RTL 拼接顺序、避免冗余表达（去掉 يرجى）、注意性别和数的一致性、方向词镜像（右→左） |

**具体检测规则**:

1. **冗余表达**: 英语 "Please input" → "Enter"，西班牙语 "Por favor" → 直接动词，阿拉伯语 "يرجى" → 直接动词
2. **装饰性符号**: 去掉波浪号 `~`、过度感叹号 `!`、西班牙语倒问号/倒感叹号 `¿¡`
3. **RTL 方向词错误**: 阿拉伯语中 "右下" 应为 "左下"（RTL 镜像），"右侧面板" 应为 "侧面板"
4. **拼接语法错误**: 西班牙语动词单复数不匹配（如 referencePrefix 后接数字时）
5. **前导/尾随空格**: 翻译值不应有前导或尾随空格
6. **截断拼接优化**: 如 `todayUpdate` + `todayUpdateSuffix` 拼接时需考虑各语种语序

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

## 10. 多语言模板拼接空格处理

**规则**: 非中文语言拼接时需要词间空格，但 flex 容器会 trim 普通空格

**原因**: 英文等语言需要空格分隔单词，但 CSS flex 容器会自动 trim 普通空格

**错误示例**:

```vue
<template>
  <!-- ❌ 错误：flex 容器中普通空格被 trim -->
  <div class="flex">
    {{ t('title.part1') }}{{ t('title.part2') }}
  </div>
  <!-- 结果：英文显示为 "HelloWorld" 而非 "Hello World" -->
</template>
```

**正确示例**:

```vue
<template>
  <!-- ✅ 方案 A：非 flex 容器使用普通空格 -->
  <div>
    {{ t('title.part1') }} {{ t('title.part2') }}
  </div>

  <!-- ✅ 方案 B：flex 容器使用 non-breaking space -->
  <div class="flex">
    {{ t('title.part1') }}{{ localeSep }}{{ t('title.part2') }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
// 中文无需空格，其他语言使用 \u00a0（non-breaking space）
const localeSep = computed(() => locale.value === 'zh-CN' ? '' : '\u00a0')
</script>
```

**工具检测规则**: 检测 template 中的多个 `{{ t() }}` 拼接，提示添加 `localeSep`

---

## 11. CSS 布局按语言动态调整

**规则**: 长语种（英文/阿拉伯语/西班牙语）需要更宽的布局空间

**原因**: 同样的内容，英文通常比中文长 30-50%，阿拉伯语/西班牙语更长

**错误示例**:

```vue
<template>
  <!-- ❌ 错误：固定宽度导致长语种被截断 -->
  <el-input 
    :placeholder="t('search.placeholder')" 
    style="width: 300px"
  />
  <!-- 英文 placeholder 被截断 -->
</template>

<style scoped>
.label {
  width: 56px; /* 中文刚好，英文被截断 */
}
</style>
```

**正确示例**:

```vue
<template>
  <!-- ✅ 方案 A：使用 computed style 动态调整 -->
  <el-input 
    :placeholder="t('search.placeholder')" 
    :style="searchInputStyle"
  />

  <!-- ✅ 方案 B：使用动态 class -->
  <div :class="`label locale-${locale}`">
    {{ t('field.name') }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// 方案 A：computed style
const searchInputStyle = computed(() => {
  if (locale.value === 'zh-CN') {
    return 'width: 300px'
  }
  return 'min-width: 300px; max-width: 450px'
})
</script>

<style scoped>
/* 方案 B：动态 class */
.label {
  width: 56px;
  flex-shrink: 0;
  white-space: nowrap;
}

.label.locale-en-US,
.label.locale-ar-SA,
.label.locale-es-ES {
  width: 90px; /* 长语种使用更宽的宽度 */
}
</style>
```

**工具检测规则**: 检测 CSS 中的固定宽度（width: Npx），提示考虑长语种适配

---

## 12. 后端数据多语种处理

**规则**: 后端返回的数据包含语种相关字段时，切换语种需重新请求接口

**原因**: 后端数据（如 displayName、description）可能根据请求头的 locale 返回不同语言

**错误示例**:

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const menuList = ref([])

onMounted(() => {
  fetchMenuList() // 只在挂载时请求一次
})

// ❌ 错误：切换语种后 menuList 中的 displayName 不更新
</script>
```

**正确示例**:

```vue
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const menuList = ref([])

const fetchMenuList = async () => {
  const res = await api.getMenuList({
    headers: { 'Accept-Language': locale.value }
  })
  menuList.value = res.data
}

onMounted(() => {
  fetchMenuList()
})

// ✅ 正确：监听 locale 变化，重新请求接口
watch(locale, () => {
  fetchMenuList()
})
</script>
```

**适用场景**:
- 级联选择器的 displayName
- 模板列表的 name/description
- 后端返回的枚举值标签

**工具检测规则**: 检测 API 请求中是否传递 locale 参数，提示需监听 locale 变化

---

## 工具规则映射

将以上 12 条经验教训映射到工具的检测规则：

| 经验教训 | 工具检测规则名称 | 检测方式 | 严重级别 |
|----------|------------------|----------|----------|
| 1. t() 响应式规则 | `reactive-t-call` | AST 分析：检测 `ref(t(...))` 和变量直接赋值 `t(...)` | error |
| 2. locale code 格式 | `locale-code-format` | 正则匹配：检测 `locale.value = 'zh-CN'` 等非注册 code | error |
| 3. 静态常量改工厂函数 | `factory-function-sync` | 跨文件分析：检测导出改为函数但导入未更新 | error |
| 4. JSX 列配置 | `jsx-column-reactive` | AST 分析：检测列配置中的 `t()` 调用未被 `computed` 包裹 | warning |
| 5. 菜单 key 语义化 | `menu-key-semantic` | 正则匹配：检测 `t(\`menu.${item.name}\`)` 使用中文 name | info |
| 6. 翻译质量 | `translation-quality` | 规则引擎：检测中式英语、冗余表达、RTL 拼接错误、装饰性符号 | warning |
| 7. 不可转换的中文 | `non-translatable-chinese` | AST + 正则：检测后端 value、图片路径、SVG 中的中文 | warning |
| 8. 公共翻译统一管理 | `shared-i18n-dedup` | 跨文件分析：检测重复的 key-value，建议提取到 shared-i18n | info |
| 9. 语种特殊化处理 | `rtl-layout-check` | 模板分析：检测阿语等 RTL 语言缺少 `dir` 属性或 CSS 适配 | warning |
| 10. 多语言模板拼接空格 | `template-concat-space` | 模板分析：检测多个 `{{ t() }}` 拼接，提示添加 `localeSep` | info |
| 11. CSS 布局动态调整 | `css-fixed-width` | CSS 分析：检测固定宽度，提示考虑长语种适配 | info |
| 12. 后端数据多语种 | `api-locale-watch` | AST 分析：检测 API 请求，提示监听 locale 变化 | info |

---

## 13. 后端约定值防护模式

**规则**: 翻译文件中与后端约定的固定值（如模板文件名、导出文件名）应抽取到独立文件，避免全局翻译优化时误改

**原因**: 后端通过固定字符串识别文件类型或功能，误改会导致功能失效

**错误示例**:

```javascript
// ❌ 错误：后端约定值与普通翻译混在一起
// locales/zh/dataCollection.json
{
  "templateWebCollection": "网页采集模板.xlsx",  // 后端约定文件名
  "pleaseSelect": "请选择"  // 普通翻译
}

// 问题：全局翻译优化时容易误将 "网页采集模板.xlsx" 改为 "Web 采集模板.xlsx"，导致后端无法识别
```

**正确示例**:

```javascript
// ✅ 正确：抽取后端约定值到独立文件
// locales/backendContracts.js
export const BACKEND_CONTRACTS = {
  zh: {
    templateWebCollection: '网页采集模板.xlsx',
    templateDataExport: '数据导出模板.xlsx'
  },
  en: {
    templateWebCollection: 'WebCollectionTemplate.xlsx',
    templateDataExport: 'DataExportTemplate.xlsx'
  }
}

// locales/zh/dataCollection.json
import { BACKEND_CONTRACTS } from '../backendContracts'
export default {
  ...BACKEND_CONTRACTS.zh,
  pleaseSelect: '请选择'
}
```

**适用场景**:
- 后端约定的模板文件名
- 后端约定的导出文件名
- 与第三方 API 约定的枚举值
- 数据库固定的 type/status 字符串

**工具检测规则**: 检测翻译值中的文件扩展名（`.xlsx`, `.pdf`, `.csv`），提示考虑是否为后端约定值

---

## 14. 图片资源多语言切换

**规则**: 图片中包含文字时，应为每种语言准备独立的图片资源，根据 locale 动态切换

**原因**: 仅翻译文本内容无法覆盖图片中的硬编码文字，需要替换整个图片资源

**错误示例**:

```vue
<template>
  <!-- ❌ 错误：图片中包含中文文字，未做多语言处理 -->
  <img src="@/assets/banner.png" />
  <!-- 图片中的 "欢迎使用" 在英文环境下仍显示中文 -->
</template>
```

**正确示例**:

```vue
<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// 方案 A：使用 computed 动态切换
const bannerImg = computed(() => {
  if (locale.value === 'zh-CN') {
    return require('@/assets/banner.png')
  } else if (locale.value === 'en-US') {
    return require('@/assets/banner_en.png')
  } else if (locale.value === 'ar-SA') {
    return require('@/assets/banner_ar.png')
  }
  return require('@/assets/banner_en.png')  // 默认英文
})

// 方案 B：使用模板字符串
const bannerImg = computed(() => 
  require(`@/assets/banner_${locale.value === 'zh-CN' ? '' : locale.value.split('-')[0]}.png`)
)
</script>

<template>
  <!-- ✅ 正确：根据语言动态切换图片 -->
  <img :src="bannerImg" />
</template>
```

**命名规范**: `原文件名_语言代码.扩展名`（如 `banner_en.png`, `banner_ar.png`，中文默认无后缀或 `_zh.png`）

**工具检测规则**: 检测 `<img :src="require(...)"` 或 `<img src="...">` 静态图片路径，提示考虑多语言图片切换

---

## 15. 表单输入框 maxlength 动态适配

**规则**: 固定的 `maxlength` 应根据语种动态调整，长语种需要更大的输入限制

**原因**: 英文等长语种的表达通常比中文长 30-50%，固定的 maxlength 会限制用户正常输入

**错误示例**:

```vue
<template>
  <!-- ❌ 错误：固定 maxlength 限制长语种用户输入 -->
  <el-input 
    v-model="form.name"
    maxlength="20"
    placeholder="请输入姓名"
  />
  <!-- 中文 20 字足够，但英文可能需要 50 字 -->
</template>
```

**正确示例**:

```vue
<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// 方案 A：基于语种动态调整
const nameMaxlength = computed(() => 
  locale.value === 'zh-CN' ? 20 : 50
)

// 方案 B：基于字节数或字符集调整
const nameMaxlength = computed(() => {
  const isCJK = ['zh-CN', 'zh-TW', 'ja-JP', 'ko-KR'].includes(locale.value)
  return isCJK ? 20 : 50
})
</script>

<template>
  <!-- ✅ 正确：根据语种动态调整 maxlength -->
  <el-input 
    v-model="form.name"
    :maxlength="nameMaxlength"
    :placeholder="t('form.namePlaceholder')"
  />
</template>
```

**建议倍率**:
- 中文 10 字 → 其他语言 30-50 字
- 中文 20 字 → 其他语言 50-80 字
- 中文 50 字 → 其他语言 150-200 字

**工具检测规则**: 检测固定的 `maxlength="10"` 或 `maxlength="20"` 等较小值，提示动态适配

---

## 16. 碎片化翻译拼接问题

**规则**: 一个完整的语义单元（句子/短语）必须是一个翻译 key，不能拆分成多个 key 拼接

**原因**: 不同语言的语法结构不同，拆分拼接会导致各语种语法不通或语序错误

**错误示例**:

```vue
<template>
  <!-- ❌ 错误：拆分成多个 key 拼接 -->
  {{ $t('knowledgeFoundPrefix') }}{{ count }}{{ $t('knowledgeCount') }}
  <!-- 中文: "为您找到" + 5 + "条知识" = "为您找到5条知识" ✓ -->
  <!-- 英文: "Found for you" + 5 + "knowledge items" = "Found for you 5 knowledge items" ✗ -->
  <!-- 西班牙语: "Encontrado para ti" + 5 + "elementos" = 语序错误 ✗ -->
</template>

<script setup>
// ❌ 错误：多段文案拼接
const message = `${t('prefix')} ${userName} ${t('suffix')}`
// 不同语言语序可能不同
</script>
```

**正确示例**:

```vue
<template>
  <!-- ✅ 正确：使用插值变量，保持完整语义单元 -->
  {{ $t('knowledgeSummary', { count }) }}
</template>

<script setup>
// locales/zh/common.json
// "knowledgeSummary": "为您找到 {count} 条知识"

// locales/en/common.json
// "knowledgeSummary": "Found {count} knowledge items"

// locales/es/common.json
// "knowledgeSummary": "Se encontraron {count} elementos de conocimiento"

// ✅ 正确：完整的消息模板
const message = t('userActionMessage', { name: userName, action: 'login' })
// "userActionMessage": "{name} 已{action}"
// "userActionMessage": "{name} has {action}ed"
</script>
```

**核心原则**: 
- 一个完整的句子 → 一个翻译 key
- 一个完整的短语 → 一个翻译 key
- 动态内容通过插值变量 `{variable}` 传递

**工具检测规则**: 检测多个 `{{ $t() }}` 或 `t()` 紧邻拼接（中间只有空格或变量），提示合并为单个 key

---

## 17. SSE/WebSocket 请求的语言参数传递

**规则**: SSE/WebSocket 等特殊请求需手动添加语言参数，不能依赖 axios 拦截器

**原因**: 普通 HTTP 请求通过 axios 拦截器自动添加 `Accept-Language` header，但 SSE/WebSocket 绕过拦截器

**错误示例**:

```javascript
import { fetchEventSource } from '@microsoft/fetch-event-source'

// ❌ 错误：未传递语言参数，后端无法识别用户语言
await fetchEventSource(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  // 缺少语言相关 header
})

// ❌ 错误：WebSocket 未传递语言参数
const ws = new WebSocket(wsUrl)
```

**正确示例**:

```javascript
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getLanguage } from '@/lang'  // 获取当前语言

// ✅ 正确：SSE 请求传递语言参数
await fetchEventSource(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': getLanguage(),
    'language': getLanguage(),  // 兼容后端多种参数名
    'lang': getLanguage()
  }
})

// ✅ 正确：WebSocket 通过 URL 参数传递语言
const ws = new WebSocket(`${wsUrl}?lang=${getLanguage()}`)

// 或在连接后的第一条消息中传递
ws.onopen = () => {
  ws.send(JSON.stringify({ 
    type: 'init',
    lang: getLanguage()
  }))
}
```

**注意事项**:
- 后端可能同时支持 `Accept-Language`/`language`/`lang` 多种参数名，建议全部传递
- SSE 使用 header 传递
- WebSocket 使用 URL 参数或首条消息传递

**工具检测规则**: 检测 `fetchEventSource`/`new EventSource`/`new WebSocket` 调用，提示添加语言 header 或参数

---

## 18. 侧边栏/折叠面板的响应式更新问题

**规则**: 将 `computed` 或 `t()` 结果缓存到 `ref` 的场景，必须监听 `locale` 变化并手动同步

**原因**: `ref` 缓存的数据不会自动响应语言切换，需要手动触发更新

**错误示例**:

```javascript
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const actions = computed(() => [
  { label: t('common.edit'), icon: 'edit' },
  { label: t('common.delete'), icon: 'delete' }
])

const visibleActions = ref([])

const checkActionsLayout = () => {
  // 根据容器宽度决定显示哪些按钮
  visibleActions.value = actions.value.slice(0, 3)
}

onMounted(() => {
  checkActionsLayout()
})

// ❌ 错误：切换语言后，visibleActions 中缓存的 label 不更新
```

**正确示例**:

```javascript
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const actions = computed(() => [
  { label: t('common.edit'), icon: 'edit' },
  { label: t('common.delete'), icon: 'delete' }
])

const visibleActions = ref([])

const checkActionsLayout = () => {
  visibleActions.value = actions.value.slice(0, 3)
}

onMounted(() => {
  checkActionsLayout()
})

// ✅ 正确：监听语言变化，更新缓存的按钮列表
watch(locale, () => {
  checkActionsLayout()
})

// ✅ 或者：监听 actions 变化
watch(actions, () => {
  checkActionsLayout()
}, { deep: true })
```

**适用场景**:
- 侧边栏收起时缓存可见按钮列表
- 折叠面板缓存展开/收起的动作项
- 工具栏根据容器宽度缓存显示的按钮
- 任何将 `computed` 结果赋值给 `ref` 的场景

**核心原则**: `ref` 缓存包含 `t()` 的数据 → 必须 `watch(locale)` 同步

**工具检测规则**: 检测 `ref` 被赋值为包含 `t()` 的对象/数组，且缺少 `watch(locale)`，提示添加监听

---

## 19. 默认语言和 fallback 语言的统一管理

**规则**: 默认语言和 fallback 语言应定义为常量统一管理，避免各处硬编码

**原因**: 硬编码语言 code 导致切换默认语言需要全局搜索替换，容易遗漏

**错误示例**:

```javascript
// ❌ 错误：各处硬编码 'zh-CN' 作为 fallback
// src/utils/request.js
axios.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = 
    localStorage.getItem('app-locale') || 'zh-CN'  // 硬编码
  return config
})

// src/i18n/index.js
const i18n = createI18n({
  locale: localStorage.getItem('app-locale') || 'zh-CN',  // 硬编码
  fallbackLocale: 'zh-CN'  // 硬编码
})

// 问题：切换默认语言为英文时，需要全局搜索 'zh-CN' 并替换，容易遗漏
```

**正确示例**:

```javascript
// ✅ 正确：在 shared-i18n 中统一定义常量
// packages/shared-i18n/src/constants.js
export const DEFAULT_LOCALE = 'en-US'
export const FALLBACK_LOCALE = 'en-US'
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US', 'ar-SA', 'es-ES']

// src/utils/request.js
import { DEFAULT_LOCALE } from 'shared-i18n'

axios.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = 
    localStorage.getItem('app-locale') || DEFAULT_LOCALE
  return config
})

// src/i18n/index.js
import { DEFAULT_LOCALE, FALLBACK_LOCALE } from 'shared-i18n'

const i18n = createI18n({
  locale: localStorage.getItem('app-locale') || DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE
})

// 优势：修改默认语言只需改一处常量定义
```

**适用场景**:
- axios 拦截器中的默认语言
- i18n 初始化的 locale 和 fallbackLocale
- localStorage 读取时的默认值
- 语言切换器的默认选项

**工具检测规则**: 检测硬编码的语言 code（如 `'zh-CN'`, `'en-US'`）作为 fallback 值或默认值，提示引用常量

---

## 工具规则映射

将以上 19 条经验教训映射到工具的检测规则：

| 经验教训 | 工具检测规则名称 | 检测方式 | 严重级别 |
|----------|------------------|----------|----------|
| 1. t() 响应式规则 | `reactive-t-call` | AST 分析：检测 `ref(t(...))` 和变量直接赋值 `t(...)` | error |
| 2. locale code 格式 | `locale-code-format` | 正则匹配：检测 `locale.value = 'zh-CN'` 等非注册 code | error |
| 3. 静态常量改工厂函数 | `factory-function-sync` | 跨文件分析：检测导出改为函数但导入未更新 | error |
| 4. JSX 列配置 | `jsx-column-reactive` | AST 分析：检测列配置中的 `t()` 调用未被 `computed` 包裹 | warning |
| 5. 菜单 key 语义化 | `menu-key-semantic` | 正则匹配：检测 `t(\`menu.${item.name}\`)` 使用中文 name | info |
| 6. 翻译质量 | `translation-quality` | 规则引擎：检测中式英语、冗余表达、RTL 拼接错误、装饰性符号 | warning |
| 7. 不可转换的中文 | `non-translatable-chinese` | AST + 正则：检测后端 value、图片路径、SVG 中的中文 | warning |
| 8. 公共翻译统一管理 | `shared-i18n-dedup` | 跨文件分析：检测重复的 key-value，建议提取到 shared-i18n | info |
| 9. 语种特殊化处理 | `rtl-layout-check` | 模板分析：检测阿语等 RTL 语言缺少 `dir` 属性或 CSS 适配 | warning |
| 10. 多语言模板拼接空格 | `template-concat-space` | 模板分析：检测多个 `{{ t() }}` 拼接，提示添加 `localeSep` | info |
| 11. CSS 布局动态调整 | `css-fixed-width` | CSS 分析：检测固定宽度，提示考虑长语种适配 | info |
| 12. 后端数据多语种 | `api-locale-watch` | AST 分析：检测 API 请求，提示监听 locale 变化 | info |
| 13. 后端约定值防护 | `backend-contract-guard` | 正则匹配：检测翻译值中的文件扩展名，提示抽取到独立文件 | warning |
| 14. 图片资源多语言切换 | `image-i18n-switch` | 模板分析：检测静态图片路径，提示考虑多语言图片切换 | info |
| 15. 表单 maxlength 适配 | `maxlength-dynamic` | 模板分析：检测固定 maxlength，提示动态适配 | info |
| 16. 碎片化翻译拼接 | `fragmented-translation` | AST 分析：检测多个 `t()` 紧邻拼接，提示合并为单个 key | warning |
| 17. SSE/WebSocket 语言参数 | `sse-ws-locale-param` | AST 分析：检测 SSE/WebSocket 调用，提示添加语言参数 | warning |
| 18. 缓存数据响应式更新 | `cached-ref-locale-watch` | AST 分析：检测 `ref` 缓存包含 `t()` 的数据，提示监听 `locale` | warning |
| 19. 默认语言统一管理 | `locale-constant-usage` | 正则匹配：检测硬编码语言 code 作为默认值，提示引用常量 | info |

---

## 相关文档

- [README.md](./README.md) - 工具概述和快速开始
- [technical-design.md](./technical-design.md) - 技术设计和架构
- [special-cases.md](./special-cases.md) - 特殊场景处理指南
