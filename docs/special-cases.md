# 特殊场景处理指南

> 国际化自动化工具 - 特殊场景和边界情况处理  
> 最后更新：2026-04-28

## 目录

- [1. 不可转换的中文识别](#1-不可转换的中文识别)
- [2. 公共翻译统一管理](#2-公共翻译统一管理)
- [3. 语种特殊化处理](#3-语种特殊化处理)
- [4. 边界情况处理](#4-边界情况处理)
- [5. 多语言模板拼接空格](#5-多语言模板拼接空格)
- [6. CSS 布局按语言动态调整](#6-css-布局按语言动态调整)
- [7. 后端数据多语种处理](#7-后端数据多语种处理)

---

## 1. 不可转换的中文识别

### 1.1 后端交互的 value 值

**场景**：与后端 API 交互时，请求参数或响应数据中的中文值

```javascript
// ❌ 不能转换
const params = {
  status: '已完成',  // 后端枚举值，不能改为 t('status.completed')
  type: '报告'       // 后端约定的类型值
}

// ✅ 正确做法：仅转换显示文案
const statusMap = {
  '已完成': t('status.completed'),
  '进行中': t('status.inProgress')
}
```

**工具检测规则**：
- 检测对象属性值为中文且属性名为常见后端字段（status、type、code、category 等）
- 检测 axios 请求参数中的中文值
- 生成警告清单，提示需后端配合支持多语言

### 1.2 图片中的中文文字

**场景**：图片资源中包含中文文字（如 logo、banner、插图）

```vue
<!-- ❌ 不能仅靠 i18n 解决 -->
<img src="@/assets/welcome-banner.png" />

<!-- ✅ 正确做法：准备多语言图片资源 -->
<img :src="getBannerImage()" />

<script setup>
import { useI18n } from 'vue-i18n'
const { locale } = useI18n()
const getBannerImage = () => {
  const images = {
    zh: require('@/assets/welcome-banner-zh.png'),
    en: require('@/assets/welcome-banner-en.png'),
    es: require('@/assets/welcome-banner-es.png'),
    ar: require('@/assets/welcome-banner-ar.png')
  }
  return images[locale.value] || images.zh
}
</script>
```

**工具检测规则**：
- 扫描 `<img>` 标签和 CSS `background-image`
- 检测图片文件名中是否包含语义化关键词（banner、logo、guide、welcome 等）
- 生成清单，提示需准备多语言图片资源

### 1.3 SVG 中的中文文字

**场景**：SVG 图标或插图中包含 `<text>` 节点的中文

```vue
<!-- ❌ SVG 中的硬编码中文 -->
<svg>
  <text>欢迎使用</text>
</svg>

<!-- ✅ 方案 A：提取为 i18n -->
<svg>
  <text>{{ $t('welcome.title') }}</text>
</svg>

<!-- ✅ 方案 B：准备多语言 SVG 文件 -->
<component :is="getWelcomeSvg()" />
```

**工具检测规则**：
- 解析 `.vue` 文件中的 `<svg>` 标签
- 检测 `<text>` 节点中的中文内容
- 生成清单，提示需提取为 i18n 或准备多语言 SVG

---

## 2. 公共翻译统一管理

### 2.1 重复翻译检测

**场景**：多个应用/模块中定义了相同的翻译 key

```javascript
// apps/report/src/lang/common.js
export default {
  zh: {
    common: {
      confirm: '确认',
      cancel: '取消'
    }
  }
}

// apps/deep-research/src/lang/common.js
export default {
  zh: {
    common: {
      confirm: '确认',  // 重复定义
      cancel: '取消'    // 重复定义
    }
  }
}
```

**工具检测规则**：
- 扫描所有应用的语言文件
- 统计相同 key 和相同 value 的出现次数
- 当某个翻译在 3+ 个位置重复出现时，建议合并到 shared-i18n

**工具输出示例**：
```
检测到 15 个重复翻译 key：

高频重复（建议合并到 shared-i18n）：
  - common.confirm ('确认') - 出现 8 次
  - common.cancel ('取消') - 出现 8 次
  - common.save ('保存') - 出现 6 次
  - commonTable.edit ('编辑') - 出现 12 次
  - commonTable.delete ('删除') - 出现 12 次

建议操作：
  1. 将以上 key 移动到 packages/shared-i18n/locales/
  2. 从各应用 common.js 中删除重复定义
  3. 运行 pnpm install 更新依赖
```

---

## 3. 语种特殊化处理

### 3.1 阿拉伯语 RTL 布局适配 ⚠️

**状态**：翻译文案已完成，但 RTL 布局适配尚未实施

**需要处理的方面**：

#### 1) 文字方向

```css
/* 需要根据语种动态设置 */
html[lang="ar"] {
  direction: rtl;
}
```

#### 2) 布局镜像

```css
/* 左右布局需要镜像 */
.sidebar {
  left: 0; /* LTR */
}

html[lang="ar"] .sidebar {
  left: auto;
  right: 0; /* RTL */
}
```

#### 3) 图标翻转

```vue
<!-- 方向性图标需要翻转 -->
<el-icon :class="{ 'rtl-flip': locale === 'ar' }">
  <ArrowRight />
</el-icon>

<style>
.rtl-flip {
  transform: scaleX(-1);
}
</style>
```

#### 4) padding/margin 方向

```css
/* 使用逻辑属性 */
.card {
  padding-inline-start: 16px; /* 代替 padding-left */
  margin-inline-end: 8px;     /* 代替 margin-right */
}
```

**工具检测规则**：
- 检测 CSS 中的 `left/right`、`padding-left/right`、`margin-left/right`
- 检测方向性图标（ArrowLeft、ArrowRight、ChevronLeft 等）
- 生成 RTL 适配清单和建议

### 3.2 其他语种特殊处理

- **日期格式**：不同语种的日期格式不同（en: MM/DD/YYYY, zh: YYYY-MM-DD）
- **数字格式**：千分位分隔符（en: 1,000.00, es: 1.000,00）
- **货币符号**：位置和格式（en: $100, zh: ¥100）

**建议**：使用 `Intl` API 处理这些格式化需求，而非硬编码。

---

## 4. 边界情况处理

### 4.1 动态生成的文案

```javascript
// 模板字符串拼接 — 不能简单替换
const message = `欢迎 ${userName}，您有 ${count} 条消息`
// ✅ 正确做法：使用插值
// t('welcome.message', { userName, count })

// 条件拼接 — 需要重构
const text = isVIP ? '尊贵的' + userName : userName + '用户'
// ✅ 正确做法：使用完整句子
// isVIP ? t('user.vipGreeting', { userName }) : t('user.greeting', { userName })

// 数组拼接 — 需要逐个替换
const labels = ['姓名', '年龄', '性别'].join(' / ')
// ✅ 正确做法：
// [t('field.name'), t('field.age'), t('field.gender')].join(' / ')
```

**工具处理策略**：
- 检测模板字符串，提示使用插值语法
- 检测字符串拼接，建议重构为完整句子
- 生成警告清单，需人工处理

### 4.2 条件渲染的文案

```vue
<template>
  <div v-if="isAdmin">管理员面板</div>
  <div v-else>普通用户面板</div>
</template>
```

**处理策略**：
- 正常替换为 `$t('adminPanel')` 和 `$t('userPanel')`
- 检测是否有遗漏的分支

### 4.3 第三方库配置中的文案

```javascript
// ECharts 配置
const chartOption = {
  title: { text: '销售趋势图' },
  legend: { data: ['销售额', '利润'] },
  xAxis: { name: '月份' }
}

// 第三方表单校验
const rules = {
  name: [{ required: true, message: '请输入姓名' }]
}
```

**工具处理策略**：
- 识别常见第三方库的配置模式（ECharts, Element Plus rules 等）
- 对于已知模式，自动替换
- 对于未知模式，生成警告清单

### 4.4 枚举和映射表

```javascript
// 状态映射 — 显示文案可以转换，value 不能
const statusMap = {
  PENDING: '待处理',    // 显示文案，可以转换
  APPROVED: '已通过',   // 显示文案，可以转换
}

// 但如果 key 也是中文（与后端约定）
const typeMap = {
  '报告': 'report',     // key 是后端 value，不能转换
  '资讯': 'news',       // key 是后端 value，不能转换
}
```

**工具处理策略**：
- 分析对象的 key-value 模式
- 如果 value 是中文且 key 是英文/常量：替换 value
- 如果 key 是中文：标记为不可转换，生成警告

---

## 工具开发优先级

基于实际改造经验，建议工具开发的优先级：

### P0（必须）

- 硬编码中文扫描
- 不可转换中文检测（后端 value、图片/SVG）
- 重复翻译检测和合并建议
- t() 响应式问题检测

### P1（重要）

- 自动生成 i18n key 和语言包
- 代码转换（硬编码 → t() 调用）
- 翻译质量检查（中式英语、冗余表达）

### P2（可选）

- RTL 布局适配检测
- CSS 固定宽度检测
- 表格列宽检测
- 自动翻译集成

---

## 5. 多语言模板拼接空格

### 5.1 问题描述

中文不需要词间空格，但英文/西班牙语/阿拉伯语等语言需要。当 template 中多个 `{{ t() }}` 拼接时，非中文语言会出现单词粘连。

此外，CSS flex 容器会 trim 普通空格，需要使用 `\u00a0`（non-breaking space）。

### 5.2 解决方案

```vue
<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { locale } = useI18n()

// 非 flex 容器用普通空格
const localeSep = computed(() => locale.value === 'zh-CN' ? '' : ' ')
// flex 容器用 non-breaking space（防止被 trim）
const localeSepNbsp = computed(() => locale.value === 'zh-CN' ? '' : '\u00a0')
</script>
```

### 5.3 工具检测规则

- 检测 template 中相邻的 `{{ t() }}` 或 `{{ $t() }}` 表达式
- 检测父元素是否为 flex 容器
- 生成建议：添加 `localeSep` 或 `localeSepNbsp`

---

## 6. CSS 布局按语言动态调整

### 6.1 问题描述

同样的内容，英文通常比中文长 30-50%，阿拉伯语/西班牙语更长。固定宽度的 CSS 会导致长语种文本被截断。

### 6.2 常见场景

| 场景 | 问题 | 解决方案 |
|------|------|----------|
| 搜索框 placeholder | 长语种被截断 | computed style：中文固定宽度，长语种 min/max 自适应 |
| 表单 label | 宽度不够 | 动态 class：`.locale-${locale}` + CSS 覆盖 |
| 按钮文本 | 溢出 | 使用 `white-space: nowrap` + `min-width` |
| 表格列宽 | 列头被截断 | 使用 `min-width` 代替 `width` |

### 6.3 工具检测规则

- 检测 CSS 中的固定宽度（`width: Npx`），提示考虑长语种适配
- 检测 `style="width: ..."` 内联样式
- 检测 Element Plus 组件的 `width` 属性

---

## 7. 后端数据多语种处理

### 7.1 问题描述

后端返回的数据可能包含语种相关字段（如 displayName、description），切换语种后需要重新请求接口获取对应语言的数据。

### 7.2 适用场景

- 级联选择器的 displayName（后端根据 Accept-Language 返回）
- 模板列表的 name/description
- 菜单名称（后端动态返回）
- AI 生成的摘要/模板

### 7.3 解决方案

```vue
<script setup>
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// 监听 locale 变化，重新请求接口
watch(locale, () => {
  fetchMenuList()
  fetchTemplateList()
})
</script>
```

### 7.4 工具检测规则

- 检测 `onMounted` 中的 API 请求，提示是否需要监听 locale 变化
- 检测 `watch(locale)` 是否已存在
- 生成建议清单

---

## 相关文档

- [技术设计文档](./technical-design.md) - 技术栈、核心流程、配置示例
- [生产环境实施指南](./production-guide.md) - 安全性、版本控制、团队协作
- [经验教训](./lessons-learned.md) - 从实际改造中总结的规则和最佳实践
