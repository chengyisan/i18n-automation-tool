# Phase 3.5: 基于实战经验的检测能力增强计划

## 背景

分析实际 i18n 改造项目最新 20 条提交（2026-04-23 ~ 2026-04-28），发现 6 类新的 i18n 问题模式。需要将这些实战经验固化到工具的检测规则中。

## 已完成

- [x] 补充 `docs/lessons-learned.md`（新增第 10-12 条经验）
- [x] 补充 `docs/special-cases.md`（新增第 5-7 章节）
- [x] 更新版本号 0.1.0 → 0.3.0

## 增强内容

### 增强 1: RedundancyChecker 补充多语种冗余规则 (core)

**文件**: `packages/core/src/quality/RedundancyChecker.ts`

**现状**: 仅检测英语冗余表达（please kindly, basic fundamentals 等通用模式）

**新增规则**:
- 英语: `please input` → `enter`, `please confirm whether` → `confirm?`, `please select` → `select`
- 西班牙语: `Por favor` 开头 → 直接动词, 波浪号 `~`, 过度感叹号 `¡...!`
- 阿拉伯语: `يرجى` 开头 → 直接动词
- 通用: 前导/尾随空格检测, 装饰性符号 `~` `!` 检测

**测试**: 补充对应测试用例

### 增强 2: ChinglishChecker 补充中式英语规则 (core)

**文件**: `packages/core/src/quality/ChinglishChecker.ts`

**现状**: 需确认现有规则

**新增规则**:
- `please input xxx` → `Enter xxx`
- `please confirm whether to` → `Delete?` / `Confirm?`
- `whether or not` → 去掉 `or not`
- `do you want to` → 直接动词
- `operation success` → `Done` / `Saved`

### 增强 3: ReactiveChecker 补充 JSX 列配置检测 (adapter-vue3)

**文件**: `packages/adapter-vue3/src/checker/reactiveChecker.ts`

**现状**: 检测 ref(t())、静态对象/数组中的 t()、顶层 t() 赋值

**新增规则**:
- 检测 JSX 文件中导出函数返回的数组/对象包含 t() 调用
- 类型: `jsx-column-with-t`
- 建议: 在调用方使用 `computed(() => useColumn())`

### 增强 4: TemplateConcatChecker 新增模板拼接空格检测 (adapter-vue3)

**文件**: `packages/adapter-vue3/src/checker/templateConcatChecker.ts` (新建)

**功能**:
- 检测 template 中相邻的 `{{ t() }}` 或 `{{ $t() }}` 表达式之间缺少空格分隔
- 类型: `template-concat-missing-space`
- 建议: 添加 `localeSep` computed 属性

### 增强 5: LayoutChecker 补充 CSS 固定宽度检测 (core)

**文件**: `packages/core/src/validator/LayoutChecker.ts`

**现状**: 需确认现有规则

**新增规则**:
- 检测 CSS 中的固定宽度 `width: Npx`（N < 500）
- 检测内联 style 中的固定宽度
- 类型: `css-fixed-width`
- 建议: 使用 `min-width` / `max-width` 或 computed style

## 实施步骤

### Step 1: 增强 RedundancyChecker + ChinglishChecker (core)
1. 补充多语种冗余规则
2. 补充中式英语规则
3. 补充测试用例

### Step 2: 增强 ReactiveChecker (adapter-vue3)
1. 添加 JSX 列配置检测规则
2. 补充测试用例

### Step 3: 新增 TemplateConcatChecker (adapter-vue3)
1. 实现模板拼接空格检测
2. 编写测试
3. 更新 index.ts 导出

### Step 4: 增强 LayoutChecker (core)
1. 补充 CSS 固定宽度检测
2. 补充测试用例

## 验证方式

```bash
pnpm test  # 运行全部测试
```
