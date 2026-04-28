# VueSfcParser 规格文档

## 功能描述

Vue SFC 解析器，使用 @vue/compiler-sfc 解析 .vue 文件，分离 template/script/style 块，对 script 块使用 @babel/parser 解析为 AST。

## 输入输出

**输入**:
- `source: string` — Vue SFC 文件内容
- `filePath: string` — 文件路径（用于错误报告）

**输出**: `ParsedVueSfc` 接口
```typescript
interface ParsedVueSfc {
  template: { content: string; ast: any; startLine: number } | null
  script: { content: string; ast: any; startLine: number; lang: 'js' | 'ts' } | null
  scriptSetup: { content: string; ast: any; startLine: number; lang: 'js' | 'ts' } | null
  styles: Array<{ content: string; startLine: number; scoped: boolean }>
  filePath: string
}
```

## 核心算法/流程

1. 使用 `@vue/compiler-sfc` 的 `parse()` 分离 SFC 块
2. 对 script/scriptSetup 块使用 `@babel/parser` 解析为 AST（支持 TypeScript、JSX 插件）
3. template 块保留 `@vue/compiler-sfc` 解析的 AST
4. 收集所有 style 块信息

## 边界情况处理

- 无 template 块的 SFC（纯逻辑组件）
- 无 script 块的 SFC（纯模板组件）
- 同时有 script 和 script setup 的 SFC
- TypeScript 的 script 块（lang="ts"）
- 多个 style 块
- 空文件或非 Vue 文件

## 测试用例

1. 解析标准 Vue SFC（template + script setup + style）
2. 解析含 TypeScript 的 SFC
3. 解析含多个 style 块的 SFC
4. 解析只有 template 的 SFC
5. 解析只有 script 的 SFC
6. 解析同时有 script 和 script setup 的 SFC
7. 空内容处理

## 实现注意事项

- `@babel/parser` 需要启用 `typescript` 和 `jsx` 插件
- `startLine` 需要正确计算（SFC 中各块的起始行号）
- 解析错误应该抛出有意义的错误信息，包含文件路径
- template AST 使用 `@vue/compiler-sfc` 的 `compileTemplate` 生成
