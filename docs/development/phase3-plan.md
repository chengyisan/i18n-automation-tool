# Phase 3 开发计划：adapter-vue3 包

## 目标

实现 Vue 3 适配器层，提供 Vue SFC 解析、代码替换、响应式问题检测等 Vue 3 特定能力。

## 背景

core 包（Phase 1 + Phase 2）已完成，提供了框架无关的扫描、翻译、质量检查、验证能力。adapter-vue3 是连接 core 扫描能力和实际代码修改的桥梁。没有它，工具只能"发现问题"，不能"修复问题"。

## 现有状态

- `packages/adapter-vue3/package.json` 已配置好依赖（@vue/compiler-sfc, @babel/parser, @babel/traverse, jscodeshift）
- `packages/adapter-vue3/src/index.ts` 已预定义导出结构（4 个模块 + 3 个类型）
- 实际模块代码尚未实现

## 模块设计

### 1. VueSfcParser — Vue SFC 解析器

**职责**:
- 使用 `@vue/compiler-sfc` 解析 .vue 文件
- 分离 template / script / style 三个块
- 对 script 块使用 `@babel/parser` 解析为 AST
- 对 template 块使用 `@vue/compiler-sfc` 的 compileTemplate 解析
- 返回结构化的解析结果

**核心接口**:
```typescript
interface ParsedVueSfc {
  template: { content: string; ast: any; startLine: number } | null
  script: { content: string; ast: any; startLine: number; lang: 'js' | 'ts' } | null
  scriptSetup: { content: string; ast: any; startLine: number; lang: 'js' | 'ts' } | null
  styles: Array<{ content: string; startLine: number; scoped: boolean }>
  filePath: string
}
```

### 2. CodeReplacer — 代码替换器

**职责**:
- 将硬编码中文替换为 `t('key')` 调用
- template 中：`中文` → `{{ t('key') }}`，属性中：`"中文"` → `:attr="t('key')"`
- script 中：`'中文'` → `t('key')`
- 自动添加 `useI18n` 导入和 `const { t } = useI18n()` 声明
- 生成语义化的 i18n key

**核心接口**:
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

### 3. ReactiveChecker — 响应式问题检测器

**职责**:
- 检测 `ref(t('key'))` 模式 → 建议改为 `computed(() => t('key'))`
- 检测静态对象/数组中的 `t()` 调用 → 建议改为 `computed` 或工厂函数
- 检测 `const x = t('key')` 顶层赋值 → 建议改为 computed
- 基于 lessons-learned.md 中的实际经验

**核心接口**:
```typescript
interface ReactiveIssue {
  type: 'ref-with-t' | 'static-object-with-t' | 'top-level-t-assignment'
  filePath: string
  line: number
  column: number
  code: string
  suggestion: string
}
```

### 4. ElementPlusAdapter — Element Plus 适配器

**职责**:
- 检测 Element Plus 的 locale 配置
- 检测 `ElConfigProvider` 是否正确配置
- 检测 Element Plus 组件中的中文（如 placeholder、label）
- 提供 Element Plus 国际化接入建议

**核心接口**:
```typescript
interface ElementPlusIssue {
  type: 'missing-config-provider' | 'missing-locale-import' | 'hardcoded-prop'
  filePath: string
  line: number
  message: string
  suggestion: string
}
```

## 实施步骤

### Step 1: 类型定义和 SFC 解析器（高优先级）
1. 创建 `src/types.ts` — 定义所有接口
2. 创建 `docs/specs/adapter-vue3/VueSfcParser.md` — 规格文档
3. 实现 `src/parser/vueSfcParser.ts`
4. 编写测试 `src/__tests__/vueSfcParser.test.ts`

### Step 2: 代码替换器（高优先级）
1. 创建 `docs/specs/adapter-vue3/CodeReplacer.md` — 规格文档
2. 实现 `src/replacer/codeReplacer.ts`
3. 编写测试 `src/__tests__/codeReplacer.test.ts`

### Step 3: 响应式检测器（高优先级）
1. 创建 `docs/specs/adapter-vue3/ReactiveChecker.md` — 规格文档
2. 实现 `src/checker/reactiveChecker.ts`
3. 编写测试 `src/__tests__/reactiveChecker.test.ts`

### Step 4: Element Plus 适配器（中优先级）
1. 创建 `docs/specs/adapter-vue3/ElementPlusAdapter.md` — 规格文档
2. 实现 `src/ui-lib/elementPlusAdapter.ts`
3. 编写测试 `src/__tests__/elementPlusAdapter.test.ts`

### Step 5: 集成和导出
1. 更新 `src/index.ts` 确认导出
2. 运行全部测试
3. 创建 `docs/development/phase3-summary.md`

## 关键文件清单

**新建文件**:
- `packages/adapter-vue3/src/types.ts`
- `packages/adapter-vue3/src/parser/vueSfcParser.ts`
- `packages/adapter-vue3/src/replacer/codeReplacer.ts`
- `packages/adapter-vue3/src/checker/reactiveChecker.ts`
- `packages/adapter-vue3/src/ui-lib/elementPlusAdapter.ts`
- `packages/adapter-vue3/src/__tests__/vueSfcParser.test.ts`
- `packages/adapter-vue3/src/__tests__/codeReplacer.test.ts`
- `packages/adapter-vue3/src/__tests__/reactiveChecker.test.ts`
- `packages/adapter-vue3/src/__tests__/elementPlusAdapter.test.ts`
- `docs/specs/adapter-vue3/VueSfcParser.md`
- `docs/specs/adapter-vue3/CodeReplacer.md`
- `docs/specs/adapter-vue3/ReactiveChecker.md`
- `docs/specs/adapter-vue3/ElementPlusAdapter.md`
- `docs/development/phase3-plan.md`
- `docs/development/phase3-summary.md`

**修改文件**:
- `packages/adapter-vue3/src/index.ts`（确认导出）

## 验证方式

```bash
cd packages/adapter-vue3
pnpm test          # 运行所有测试
```

测试用例应覆盖：
- Vue SFC 解析（template/script/scriptSetup/style 分离）
- 代码替换（template 文本、属性、script 字符串）
- 响应式检测（ref+t、静态对象+t、顶层赋值+t）
- Element Plus 配置检测

## 依赖关系

```
adapter-vue3
├── @i18n-tool/core (workspace)     — 类型定义、扫描结果
├── @vue/compiler-sfc               — Vue SFC 解析
├── @babel/parser                   — JS/TS AST 解析
├── @babel/traverse                 — AST 遍历
└── jscodeshift                     — 代码转换
```

## 技术要点

### Vue SFC 解析
- 使用 `@vue/compiler-sfc` 的 `parse()` API
- 正确处理 script setup 和普通 script 的区别
- 计算各块在 SFC 中的行号偏移

### AST 操作
- `@babel/parser` 需要启用 `typescript` 和 `jsx` 插件
- `@babel/traverse` 用于遍历和查找特定节点
- 注意 AST 节点的 `loc` 信息用于定位

### 响应式检测
- 基于 lessons-learned.md 中的实际经验
- 检测规则需要覆盖 ref、reactive、顶层赋值三种场景
- 建议信息应该具体可操作

### 代码替换
- template 替换从后往前进行，避免位置偏移
- script 替换基于 AST 精确定位
- 自动导入需要检测是否已存在
