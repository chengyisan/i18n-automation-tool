# Phase 3 开发总结：adapter-vue3 包

## 完成时间
2026-04-27

## 阶段目标
实现 Vue 3 适配器层，提供 Vue SFC 解析、代码替换、响应式问题检测、Element Plus 集成等 Vue 3 特定能力。

## 完成的任务清单

### 1. 类型定义 ✅
- **文件**: `packages/adapter-vue3/src/types.ts`
- **内容**: 定义了 4 个核心接口
  - `ParsedVueSfc` - Vue SFC 解析结果
  - `ReplacementResult` - 代码替换结果
  - `ReactiveIssue` - 响应式问题检测结果
  - `ElementPlusIssue` - Element Plus 问题检测结果

### 2. VueSfcParser 模块 ✅
- **文件**: `packages/adapter-vue3/src/parser/vueSfcParser.ts` (90 行)
- **功能**:
  - 使用 `@vue/compiler-sfc` 解析 .vue 文件
  - 分离 template / script / scriptSetup / style 块
  - 对 script 块使用 `@babel/parser` 解析为 AST（支持 TypeScript + JSX）
  - 返回结构化的解析结果，包含每个块的起始行号

### 3. CodeReplacer 模块 ✅
- **文件**: `packages/adapter-vue3/src/replacer/codeReplacer.ts` (533 行)
- **功能**:
  - Template 替换：纯文本 → `{{ t('key') }}`，属性值 → `:attr="t('key')"`
  - Script 替换：基于 AST 精确替换字符串字面量中的中文
  - 自动添加 `import { useI18n } from 'vue-i18n'` 和 `const { t } = useI18n()`
  - 生成语义化 key（如 `fileName.text1`、`fileName.text2`）
  - 智能跳过：import 语句、已有 t() 调用、对象 key
  - 支持自定义 keyPrefix

### 4. ReactiveChecker 模块 ✅
- **文件**: `packages/adapter-vue3/src/checker/reactiveChecker.ts` (154 行)
- **功能**:
  - 检测 `ref(t('key'))` 模式 → 建议改为 `computed(() => t('key'))`
  - 检测静态对象/数组中的 `t()` 调用 → 建议改为 computed
  - 检测顶层 `const x = t('key')` 赋值 → 建议改为 computed
  - 不误报 `computed(() => t())` 和函数内部的 `t()` 调用
  - 同时支持 `t()` 和 `$t()` 检测

### 5. ElementPlusAdapter 模块 ✅
- **文件**: `packages/adapter-vue3/src/ui-lib/elementPlusAdapter.ts` (139 行)
- **功能**:
  - 检测缺少 `ElConfigProvider` 组件
  - 检测缺少 locale 导入配置
  - 检测 Element Plus 组件中的硬编码中文（placeholder、label 等属性）
  - 支持 PascalCase 和 kebab-case 组件名
  - 不误报非 Element Plus 组件和已使用 `t()` 的属性

## 测试结果

```
Test Files  4 passed (4)
     Tests  33 passed (33)
  Duration  5.37s
```

### 测试覆盖详情

| 测试文件 | 测试数量 | 状态 |
|---------|---------|------|
| vueSfcParser.test.ts | 7 | ✅ 全部通过 |
| codeReplacer.test.ts | 11 | ✅ 全部通过 |
| reactiveChecker.test.ts | 8 | ✅ 全部通过 |
| elementPlusAdapter.test.ts | 7 | ✅ 全部通过 |

### 测试场景覆盖

**VueSfcParser (7 tests)**:
- 标准 Vue SFC 解析（template + script setup + style）
- TypeScript 支持
- 多个 style 块
- 只有 template / 只有 script 的 SFC
- 同时有 script 和 script setup
- startLine 计算

**CodeReplacer (11 tests)**:
- Template 纯文本替换
- Template 属性值替换
- Script 字符串字面量替换
- 自动添加 useI18n 导入
- 已有 useI18n 时不重复添加
- 无中文时返回空替换列表
- 语义化 key 生成
- 自定义 keyPrefix
- 不替换已有 t() 的文本
- 不替换 import 语句中的字符串
- 混合 template 和 script 替换

**ReactiveChecker (8 tests)**:
- ref(t()) 模式检测
- 静态数组中的 t() 调用
- 静态对象中的 t() 调用
- 顶层 const = t() 赋值
- computed(() => t()) 不误报
- 函数内部 t() 不误报
- 无问题时返回空数组
- $t() 调用检测

**ElementPlusAdapter (7 tests)**:
- 缺少 ElConfigProvider 检测
- 缺少 locale 导入检测
- placeholder 硬编码中文检测
- 按钮文本硬编码中文检测
- 已使用 t() 的属性不误报
- 非 Element Plus 组件不误报
- kebab-case 组件名支持

## 文件结构和代码量统计

### 新增文件 (16 个)

**源码文件 (6 个)**:
- `src/types.ts` - 类型定义
- `src/parser/vueSfcParser.ts` - SFC 解析器 (90 行)
- `src/replacer/codeReplacer.ts` - 代码替换器 (533 行)
- `src/checker/reactiveChecker.ts` - 响应式检测器 (154 行)
- `src/ui-lib/elementPlusAdapter.ts` - Element Plus 适配器 (139 行)
- `src/env.d.ts` - @babel/traverse 类型声明

**测试文件 (4 个)**:
- `src/__tests__/vueSfcParser.test.ts` (116 行)
- `src/__tests__/codeReplacer.test.ts` (146 行)
- `src/__tests__/reactiveChecker.test.ts` (113 行)
- `src/__tests__/elementPlusAdapter.test.ts` (84 行)

**配置文件 (2 个)**:
- `tsconfig.json`
- `vitest.config.ts`

**文档文件 (4 个)**:
- `docs/development/phase3-plan.md`
- `docs/specs/adapter-vue3/VueSfcParser.md`
- `docs/specs/adapter-vue3/CodeReplacer.md`
- `docs/specs/adapter-vue3/ReactiveChecker.md`
- `docs/specs/adapter-vue3/ElementPlusAdapter.md`

**修改文件 (1 个)**:
- `src/index.ts` - 添加 ElementPlusIssue 类型导出

### 代码量统计
- 源码: ~920 行
- 测试: ~460 行
- 总计: ~1380 行

## 设计亮点和技术细节

### 1. ESM 兼容性处理
`@babel/traverse` 在 ESM 环境下的默认导出行为不一致，使用 `(_traverse as any).default || _traverse` 模式兼容两种情况。

### 2. 从后往前替换策略
CodeReplacer 在 template 替换时，按位置从后往前替换，避免前面的替换导致后面的位置偏移。

### 3. AST 精确替换
Script 中的字符串替换基于 AST 节点位置，而非正则匹配，确保不会误替换注释、import 路径等。

### 4. 基于实战经验的检测规则
ReactiveChecker 的三条检测规则直接来源于 `docs/lessons-learned.md` 中 152+ 次实际 i18n 改造的经验总结。

### 5. 类型声明文件
为 `@babel/traverse` 创建了 `env.d.ts` 类型声明，解决 TypeScript 编译时的类型缺失问题。

## 经验教训

1. **@babel/traverse ESM 兼容**: 该包在 ESM 环境下默认导出的行为不一致，需要做兼容处理
2. **@vue/compiler-sfc 的 parse 结果**: `descriptor.scriptSetup` 和 `descriptor.script` 是独立的块，需要分别处理
3. **Template 替换的复杂性**: 需要同时处理文本节点和属性值两种场景，且要避免替换已有的 `{{ t() }}` 表达式

## 下一步计划

Phase 3 完成后，adapter-vue3 包提供了完整的 Vue 3 适配能力。后续阶段：

- **Phase 4**: CLI 工具包 (`packages/cli`) — 命令行交互界面
- **Phase 5**: MCP Server (`packages/mcp-server`) — Claude Code 集成
- **Phase 6**: Skill (`packages/skill`) — 交互式技能

## 验收标准

- [x] 4 个核心模块全部实现
- [x] 33 个测试用例全部通过
- [x] TypeScript 编译无错误
- [x] 导出结构与 `index.ts` 预定义一致
- [x] 规格文档完整
- [x] 总结文档完整
