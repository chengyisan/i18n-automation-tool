# UntranslatableDetector 规格说明

## 功能描述

不可转换中文检测器，负责识别代码中不应该被翻译的中文内容，并给出处理建议。这些中文通常与后端交互、图片资源或特殊场景相关。

## 核心职责

1. 检测与后端交互的中文 value 值（枚举值、状态码等）
2. 检测图片路径中的中文
3. 检测 SVG 文本节点中的中文
4. 检测动态拼接的字符串
5. 为每种情况提供处理建议

## 输入输出

### 输入

```typescript
interface DetectOptions {
  /** 文件内容 */
  content: string
  /** 文件路径 */
  filePath: string
  /** 配置 */
  config: I18nToolConfig
}
```

### 输出

```typescript
interface UntranslatableItem {
  text: string
  line: number
  column: number
  /** 不可转换的原因 */
  reason: 'backend-value' | 'image-text' | 'svg-text' | 'dynamic-string'
  /** 处理建议 */
  suggestion: string
}
```

## 检测规则

### 1. 后端交互 value

#### 场景描述

与后端 API 交互时，某些字段的值是中文，但这些值是后端定义的枚举或状态码，不应该在前端翻译。

#### 检测模式

```typescript
// 对象属性中的 value/code/status/type 等字段
const BACKEND_VALUE_PATTERNS = [
  // { value: '已完成', label: '已完成' }
  /\{\s*value\s*:\s*['"`]([\u4e00-\u9fa5]+)['"`]/g,
  
  // { code: '待审核', name: '待审核' }
  /\{\s*code\s*:\s*['"`]([\u4e00-\u9fa5]+)['"`]/g,
  
  // { status: '进行中' }
  /\{\s*status\s*:\s*['"`]([\u4e00-\u9fa5]+)['"`]/g,
  
  // { type: '文档' }
  /\{\s*type\s*:\s*['"`]([\u4e00-\u9fa5]+)['"`]/g,
  
  // API 请求参数：axios.post('/api', { status: '已完成' })
  /(?:axios|fetch|request)\s*\.\s*(?:get|post|put|delete)\s*\([^)]*\{[^}]*(?:value|code|status|type)\s*:\s*['"`]([\u4e00-\u9fa5]+)['"`]/g,
]
```

#### 判断逻辑

1. 检查对象属性名是否在配置的 `backendValues` 列表中
2. 检查是否在 API 调用的参数中
3. 检查是否有对应的 label 字段（如果有，value 通常是后端值）

#### 处理建议

```
不可翻译：这是与后端交互的枚举值/状态码。

建议处理方式：
1. 保持 value 为中文（与后端约定）
2. 添加对应的 label 字段用于显示翻译：
   { value: '已完成', label: t('status.completed') }
3. 或者与后端协商改为英文枚举值：
   { value: 'completed', label: t('status.completed') }
```

### 2. 图片路径中的中文

#### 场景描述

图片文件名或路径包含中文，需要替换为多语言图片资源。

#### 检测模式

```typescript
// 图片路径
const IMAGE_PATH_PATTERNS = [
  // src="./images/中文图片.png"
  /(?:src|href)\s*=\s*['"`]([^'"`]*[\u4e00-\u9fa5]+[^'"`]*\.(?:png|jpg|jpeg|gif|svg|webp))['"`]/gi,
  
  // import logo from './中文图片.png'
  /import\s+\w+\s+from\s+['"`]([^'"`]*[\u4e00-\u9fa5]+[^'"`]*\.(?:png|jpg|jpeg|gif|svg|webp))['"`]/gi,
  
  // require('./中文图片.png')
  /require\s*\(\s*['"`]([^'"`]*[\u4e00-\u9fa5]+[^'"`]*\.(?:png|jpg|jpeg|gif|svg|webp))['"`]\s*\)/gi,
  
  // new URL('./中文图片.png', import.meta.url)
  /new\s+URL\s*\(\s*['"`]([^'"`]*[\u4e00-\u9fa5]+[^'"`]*\.(?:png|jpg|jpeg|gif|svg|webp))['"`]/gi,
]
```

#### 处理建议

```
不可翻译：图片路径包含中文。

建议处理方式：
1. 为每种语言准备对应的图片资源：
   - images/logo-zh.png
   - images/logo-en.png
   - images/logo-ar.png
2. 使用动态路径：
   <img :src="`./images/logo-${locale}.png`" />
3. 或者将图片中的文字提取为 i18n 文本，使用纯图标
```

### 3. SVG 文本节点中的中文

#### 场景描述

SVG 中的 `<text>` 或 `<tspan>` 节点包含中文文字。

#### 检测模式

```typescript
// SVG text 节点
const SVG_TEXT_PATTERNS = [
  // <text>中文</text>
  /<text[^>]*>([\u4e00-\u9fa5]+)<\/text>/g,
  
  // <tspan>中文</tspan>
  /<tspan[^>]*>([\u4e00-\u9fa5]+)<\/tspan>/g,
  
  // <text><tspan>中文</tspan></text>
  /<text[^>]*>[\s\S]*?<tspan[^>]*>([\u4e00-\u9fa5]+)<\/tspan>[\s\S]*?<\/text>/g,
]
```

#### 处理建议

```
不可翻译：SVG 文本节点包含中文。

建议处理方式：
1. 将 SVG 文本提取为 i18n：
   <text>{{ t('svg.label') }}</text>
2. 为每种语言准备独立的 SVG 文件：
   - icon-zh.svg
   - icon-en.svg
3. 使用 Vue 组件动态渲染 SVG 文本：
   <svg>
     <text>{{ t('label') }}</text>
   </svg>
```

### 4. 动态拼接字符串

#### 场景描述

使用模板字符串或字符串拼接，包含中文和变量混合。

#### 检测模式

```typescript
// 模板字符串中的中文
const TEMPLATE_STRING_PATTERNS = [
  // `用户${name}已登录`
  /`[^`]*[\u4e00-\u9fa5]+[^`]*\$\{[^}]+\}[^`]*[\u4e00-\u9fa5]*[^`]*`/g,
  
  // '欢迎' + name + '登录'
  /['"`][\u4e00-\u9fa5]+['"`]\s*\+\s*\w+\s*\+\s*['"`][\u4e00-\u9fa5]+['"`]/g,
]
```

#### 判断逻辑

1. 检查是否为模板字符串且包含插值
2. 检查是否为字符串拼接表达式
3. 检查中文部分是否可以独立提取

#### 处理建议

```
需要特殊处理：动态拼接的字符串。

建议处理方式：
1. 使用 i18n 插值语法：
   t('welcome', { name })  // 翻译文件：'欢迎 {name} 登录'
2. 拆分为多个 i18n key：
   `${t('welcome')} ${name} ${t('login')}`
3. 如果逻辑复杂，使用函数封装：
   function getWelcomeMsg(name) {
     return t('welcome', { name })
   }
```

## 核心方法

### `detect(options: DetectOptions): UntranslatableItem[]`

检测文件中的不可转换中文。

**流程**：
1. 检测后端 value 值
2. 检测图片路径
3. 检测 SVG 文本
4. 检测动态字符串
5. 去重并返回结果

### `detectBackendValues(content: string, config: I18nToolConfig): UntranslatableItem[]`

检测后端交互的中文值。

**实现**：
1. 遍历 `config.untranslatablePatterns.backendValues`
2. 对每个字段名构建正则
3. 匹配并提取中文值
4. 检查是否有对应的 label 字段
5. 返回结果

### `detectImagePaths(content: string): UntranslatableItem[]`

检测图片路径中的中文。

### `detectSvgText(content: string): UntranslatableItem[]`

检测 SVG 文本节点中的中文。

### `detectDynamicStrings(content: string): UntranslatableItem[]`

检测动态拼接的字符串。

## 使用示例

```typescript
import { UntranslatableDetector } from '@i18n-tool/core'

const detector = new UntranslatableDetector(config)

const result = detector.detect({
  content: fileContent,
  filePath: 'src/views/Home.vue',
  config,
})

// 输出示例
// [
//   {
//     text: '已完成',
//     line: 15,
//     column: 20,
//     reason: 'backend-value',
//     suggestion: '不可翻译：这是与后端交互的枚举值...'
//   },
//   {
//     text: './images/中文图片.png',
//     line: 28,
//     column: 15,
//     reason: 'image-text',
//     suggestion: '不可翻译：图片路径包含中文...'
//   }
// ]
```

## 测试用例

### 1. 后端 value 值

```
输入: `{ value: '已完成', label: '已完成' }`
期望: 检测到 '已完成'，reason = 'backend-value'
```

### 2. API 请求参数

```
输入: `axios.post('/api', { status: '进行中' })`
期望: 检测到 '进行中'，reason = 'backend-value'
```

### 3. 图片路径

```
输入: `<img src="./images/中文图片.png" />`
期望: 检测到路径，reason = 'image-text'
```

### 4. import 图片

```
输入: `import logo from './中文logo.png'`
期望: 检测到路径，reason = 'image-text'
```

### 5. SVG text

```
输入: `<svg><text>中文标签</text></svg>`
期望: 检测到 '中文标签'，reason = 'svg-text'
```

### 6. 模板字符串

```
输入: `const msg = \`用户\${name}已登录\``
期望: 检测到，reason = 'dynamic-string'
```

### 7. 字符串拼接

```
输入: `const msg = '欢迎' + name + '登录'`
期望: 检测到，reason = 'dynamic-string'
```

### 8. 普通对象属性

```
输入: `{ label: '名称', placeholder: '请输入' }`
期望: 不检测（这些应该被 ChineseScanner 检测）
```

### 9. 无不可转换内容

```
输入: `const title = '标题'`
期望: 返回空数组
```

### 10. 混合场景

```
输入: 
  const config = {
    value: '已完成',
    label: '已完成',
    icon: './images/完成.png'
  }
期望: 检测到两项（value 和图片路径）
```

## 配置项

在 `I18nToolConfig.untranslatablePatterns` 中配置：

```typescript
untranslatablePatterns: {
  // 后端交互字段名列表
  backendValues: ['value', 'code', 'status', 'type', 'key'],
  
  // 图片扩展名列表
  imageExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'],
  
  // 是否检测 SVG 文本节点
  svgTextNodes: true,
}
```

## 实现注意事项

1. **准确性**：后端 value 的判断需要结合上下文，避免误报
2. **建议质量**：提供的处理建议要具体可操作
3. **性能**：正则匹配要高效，避免复杂的回溯
4. **可配置**：允许用户自定义后端字段名列表
5. **与 ChineseScanner 配合**：两者结果应该互斥，不重复报告

## 依赖

- 无外部依赖（纯正则 + 字符串处理）
