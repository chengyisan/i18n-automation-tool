# CodeReplacer 规格文档

## 功能描述

将 Vue SFC 中的硬编码中文替换为 t() 调用。支持 template 和 script 两种上下文的替换，自动添加 useI18n 导入。

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容
- `filePath: string` — 文件路径（用于生成 key 前缀）
- `keyPrefix?: string` — key 前缀（默认从文件路径生成）

**输出**: `ReplacementResult` 接口
```typescript
interface ReplacementResult {
  filePath: string
  originalContent: string
  modifiedContent: string
  replacements: Array<{
    original: string
    replacement: string
    key: string
    line: number
    context: 'template' | 'script'
  }>
  addedImports: string[]
}
```

## 核心算法/流程

### Template 替换规则
1. 文本节点中的中文：`中文` → `{{ t('key') }}`
2. 属性值中的中文：`attr="中文"` → `:attr="t('key')"`
3. 混合内容：`前缀{{ var }}后缀` 需要特殊处理

### Script 替换规则
1. 字符串字面量中的中文：`'中文'` → `t('key')`
2. 模板字符串中的中文：`` `中文${var}` `` → `t('key', { var })`

### 自动导入
1. 检测是否已有 `import { useI18n } from 'vue-i18n'`
2. 如果没有，在 script setup 顶部添加导入
3. 检测是否已有 `const { t } = useI18n()`
4. 如果没有，在导入后添加解构声明

### Key 生成规则
1. 基于文件路径生成前缀：`src/views/UserList.vue` → `userList`
2. 基于中文内容生成后缀：`确认删除` → `confirmDelete`（使用拼音或语义映射）
3. 简单实现：使用文件名 camelCase + 序号，如 `userList.text1`

## 边界情况处理

- 已经使用 t() 的文本不应重复替换
- 注释中的中文不应替换
- v-html 中的中文需要特殊处理
- 嵌套引号的处理
- 已有 useI18n 导入时不重复添加

## 测试用例

1. 替换 template 中的纯文本
2. 替换 template 中的属性值
3. 替换 script 中的字符串字面量
4. 自动添加 useI18n 导入
5. 已有 useI18n 时不重复添加
6. 无中文时返回空替换列表
7. 混合 template 和 script 替换

## 实现注意事项

- template 替换从后往前进行，避免位置偏移
- script 替换基于 AST 精确定位
- key 生成需要保证唯一性
- 替换后的代码应保持格式整洁
