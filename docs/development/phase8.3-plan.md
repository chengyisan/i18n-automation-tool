# Phase 8.3 开发计划：P2 规则检测器实现

## Context（背景）

Phase 8.2 已完成（commit `2470a5d`，merge commit `a70abba`，tag `v0.8.1`），交付了 2 个 P1 检测器：
- `SseWsLocaleChecker`（规则 17）
- `CachedRefLocaleChecker`（规则 18）

至此 lessons-learned.md 19 条规则已覆盖 17 条，仅剩 P2 规则 14（图片资源多语言切换）和规则 15（表单 maxlength 动态适配）。Phase 8.2 总结里建议 P2 推迟，但本期决定推进，原因：

1. **实际项目印证**：业务项目 `D:/workSpace/spark_industry_master_frontends` 最新一批提交里出现了规则 14 和规则 15 对应的真实改造（`a581a18a4` maxlength 按语种调整、`ff7cc78d8` 含中文图片切英文版），证明这两类问题在生产中确实存在且需要工具协助识别。
2. **架构契合**：两条规则都是 template 级检测，可直接复用 `templateConcatChecker.ts` 的 `descriptor.template.content + 正则`骨架，与 8.2 的 script 级检测互补，工具链能力维度更完整。
3. **本期不做的事**（明确范围）：
   - **后端枚举字段直渲检测器**：调研 `8ca8e506a` 后判定误报率高（同文件里 `typeName` 不需改、`groupCategoryName` 需改，仅靠字段名后缀无法区分），跳过。仅在文档层面补充模式说明。
   - **CachedRefLocaleChecker 增强**（computed 间接引用、深层对象赋值）：现有实现在常见场景下已全覆盖，本期不增强，留给后续按需推进。

## 阶段目标

1. 实现 `ImageI18nChecker`，检测 template 中静态 `<img>` 路径含中文资源未做多语言切换（规则 14）
2. 实现 `MaxlengthChecker`，检测表单组件固定 `maxlength` 属性未按语种动态适配（规则 15）
3. 为两个检测器各定义独立 Issue 类型（不扩展 `ReactiveIssue.type`），与 `TemplateConcatIssue` 同级
4. 集成两个检测器到 `check-reactive` CLI 命令
5. 编写规格文档和阶段总结
6. 通过完整构建和测试

## 历史遗留任务

读取 `docs/development/phase8.2-summary.md` 后确认：Phase 8.2 总结中"未完成的任务"为"无遗留任务"。Phase 8.3 不需要补完历史任务。

Phase 8.2 的"下一步计划"里列出的 `CachedRefLocaleChecker` 增强方向（computed 间接引用、深层对象赋值、跨文件 composable 追踪）经本期讨论决定推迟到后续阶段。

## 任务分解

### 任务 1：ImageI18nChecker（规则 14）

**优先级**：P2（中）

**位置**：`packages/adapter-vue3/src/checker/imageI18nChecker.ts`

**功能范围**：
- 解析 Vue SFC 的 `<template>` 块（`descriptor.template.content`）
- 用正则匹配两类静态图片引用：
  - `<img src="..." />`（普通字符串路径）
  - `<img :src="require(...)" />` 或 `<img :src="'...'" />`（绑定字符串字面量）
- 判定条件：图片 src 字符串中含中文字符（CJK Unified Ideographs `\u4e00-\u9fff`）→ 报告
- 输出 type 为 `'image-i18n-missing'`，suggestion 提示按 locale 动态切换

**不包含**：
- 动态 `:src="变量"`（变量值无法静态判断含不含中文）
- 通过 `import` 引入的图片模块（如 `import banner from '@/assets/banner.png'` 后 `<img :src="banner">`）— 跨语句静态分析复杂，留给后续
- OCR 检测图片内文字（基础设施成本过高）
- 文件名后缀已包含语言标识的（如 `banner_zh.png`、`banner_en.png`）— 视为已做多语言

**输出类型**：在 `types.ts` 新增独立接口 `ImageI18nIssue`：
```typescript
export interface ImageI18nIssue {
  type: 'image-i18n-missing'
  filePath: string
  line: number
  code: string
  suggestion: string
}
```

**实现步骤**：
1. 复用 `templateConcatChecker.ts` 的解析骨架：`sfcParse → descriptor.template.content → 正则匹配 → 行号计算`
2. 三类图片路径正则（按优先级，覆盖最常见模式）：
   - 普通字符串：`<img\s+[^>]*?src="([^"]+)"`
   - require：`<img\s+[^>]*?:src="require\(['"]([^'"]+)['"]\)"`
   - 字面量绑定：`<img\s+[^>]*?:src="['"]([^'"]+)['"]"`
3. 对每个匹配捕获的 src 字符串：
   - 检查是否含中文字符（`/[\u4e00-\u9fff]/.test(src)`）
   - 检查是否已含语言后缀（`/_(zh|en|cn|us|ar|ja|ko)(?:[-_]\w+)?\./.test(src)`）— 命中则跳过
4. 行号 = `startLine + 匹配前换行数`
5. suggestion 模板：`'图片路径含中文，建议按 locale 动态切换。参考：const imgSrc = computed(() => locale.value === \'zh-CN\' ? require(\'@/assets/xxx.png\') : require(\'@/assets/xxx_en.png\'))'`

**测试用例**（10–12 个）：
- ✅ 检测 `<img src="@/assets/欢迎.png" />`
- ✅ 检测 `<img :src="require('@/assets/产品介绍.svg')" />`
- ✅ 检测 `<img :src="'@/assets/标题图.jpg'" />`
- ✅ 不误报 `<img src="@/assets/banner.png" />`（无中文）
- ✅ 不误报 `<img src="@/assets/banner_zh.png" />`（已带语言后缀）
- ✅ 不误报 `<img src="@/assets/banner_en.png" />`（已带语言后缀）
- ✅ 不误报 `<img :src="bannerImg" />`（动态变量）
- ✅ 同一文件多个含中文图片全部检测
- ✅ 行号偏移正确（`<template>` 起始行计算）
- ✅ 解析失败返回空数组
- ✅ 无 template 块（如纯 JS 文件解析后 descriptor.template 为 null）返回空数组

---

### 任务 2：MaxlengthChecker（规则 15）

**优先级**：P2（中）

**位置**：`packages/adapter-vue3/src/checker/maxlengthChecker.ts`

**功能范围**：
- 解析 Vue SFC 的 `<template>` 块
- 检测 Element Plus 表单组件（`el-input`、`el-textarea`、`el-input-number`）上 `maxlength` 属性为固定数值字面量（即 `maxlength="20"` 而非 `:maxlength="xxx"` 或 `:maxlength="20"`）的情况
- 阈值：`maxlength` 数值 ≤ 50 时报告（中文场景下此长度对其他语言可能不足）
- 输出 type 为 `'maxlength-fixed'`，suggestion 提示用 computed 按 locale 动态调整

**不包含**：
- 原生 `<input maxlength>`（业务项目以 Element Plus 为主，原生 input 留给 Phase 8.4 增强）
- 动态绑定 `:maxlength="xxx"`（无法静态判断 xxx 是否已按 locale 适配）
- maxlength > 50 的（视为开发者已为多语言留余量）

**输出类型**：在 `types.ts` 新增独立接口 `MaxlengthIssue`：
```typescript
export interface MaxlengthIssue {
  type: 'maxlength-fixed'
  filePath: string
  line: number
  code: string
  currentValue: number
  suggestion: string
}
```

**实现步骤**：
1. 复用 template 正则解析骨架
2. 主正则匹配组件标签 + maxlength 属性（按优先级）：
   - `<el-input[^>]*?\bmaxlength="(\d+)"`
   - `<el-textarea[^>]*?\bmaxlength="(\d+)"`
   - `<el-input-number[^>]*?\bmaxlength="(\d+)"`
3. 对每个匹配：
   - 数值 ≤ 50 才报告（>50 视为开发者已留余量）
   - 排除 `:maxlength="..."`（动态绑定，正则已通过没有冒号自然排除）
4. suggestion 模板：`'固定 maxlength=${currentValue} 可能限制长语种用户输入。建议改为 :maxlength="dynamicMaxlength" 按 locale 适配，CJK 语言保持原值，其他语言放大 2-3 倍。'`

**测试用例**（10–12 个）：
- ✅ 检测 `<el-input maxlength="20" />`
- ✅ 检测 `<el-textarea maxlength="50" />`
- ✅ 检测 `<el-input-number maxlength="10" />`
- ✅ 不误报 `<el-input :maxlength="20" />`（动态绑定）
- ✅ 不误报 `<el-input :maxlength="dynamicLen" />`（动态变量）
- ✅ 不误报 `<el-input maxlength="100" />`（超过阈值，视为已留余量）
- ✅ 不误报 `<input maxlength="20" />`（原生标签，本期不检测）
- ✅ 不误报无 maxlength 属性的 `<el-input />`
- ✅ 同一文件多个固定 maxlength 全部检测
- ✅ 行号偏移正确
- ✅ 解析失败/无 template 返回空数组

---

### 任务 3：CLI 集成

**修改**：`packages/cli/src/commands/checkReactive.ts`

**变更**：
- import 增加 `ImageI18nChecker`、`MaxlengthChecker`
- 实例化两个新 checker
- 增加 `imageIssues`、`maxlengthIssues` 数组
- 循环中调用 `.check(content, file)` 收集
- JSON 输出新增字段：`imageI18nIssues`、`maxlengthIssues`
- 人类可读输出新增两段（按现有 5 类问题分组之后追加，达到 7 类）：
  ```
  含中文图片资源未多语言化: N 个
    path:line [image-i18n-missing]
      <suggestion>

  表单 maxlength 未按语种适配: N 个
    path:line [maxlength-fixed]
      <suggestion>
  ```
- `totalIssues` 加入两个新数组长度
- 退出码逻辑保持不变（issues > 0 → exit 1）

---

### 任务 4：类型定义和导出更新

**修改 1**：`packages/adapter-vue3/src/types.ts`

新增两个独立 Issue 接口（与 `TemplateConcatIssue` 同级，不扩展 `ReactiveIssue.type`）：
```typescript
export interface ImageI18nIssue { ... }
export interface MaxlengthIssue { ... }
```

并将两个新类型加入 index.ts 的 type 导出列表。

**修改 2**：`packages/adapter-vue3/src/index.ts`

```typescript
export { ImageI18nChecker } from './checker/imageI18nChecker.js'
export { MaxlengthChecker } from './checker/maxlengthChecker.js'

export type { ..., ImageI18nIssue, MaxlengthIssue } from './types.js'
```

---

### 任务 5：单元测试

**新增文件**：
- `packages/adapter-vue3/src/__tests__/imageI18nChecker.test.ts`
- `packages/adapter-vue3/src/__tests__/maxlengthChecker.test.ts`

**测试约定**（参考 `templateConcatChecker.test.ts` 风格）：
- Vitest `describe` / `it` / `expect`
- 中文 `it` 描述
- 顶部实例化一次 checker
- 用模板字符串构造 Vue SFC
- 断言 `toHaveLength()` + `expect(issues[0].type).toBe(...)` + `expect(issues[0].suggestion).toContain(...)`

**覆盖率目标**：> 80%

---

### 任务 6：文档落地

**计划落地**（CLAUDE.md 要求）：
- `docs/development/phase8.3-plan.md` — 本计划文档（在实施前写入项目）

**规格文档**：
- `docs/specs/adapter-vue3/ImageI18nChecker.md` — 参考 `SseWsLocaleChecker.md` 模板
- `docs/specs/adapter-vue3/MaxlengthChecker.md`

**阶段总结**（实施完成后）：
- `docs/development/phase8.3-summary.md` — 参考 `phase8.2-summary.md` 模板

**lessons-learned.md 补充**（可选）：
- 在规则 13 后或单独章节补充"后端中文枚举字段直渲处理模式"作为开发者手动参考，标注"工具暂未自动检测，需人工识别"。本期可做也可推迟。

## 实现顺序

1. 写入计划文档 — 本计划写入 `docs/development/phase8.3-plan.md`
2. 类型定义先行 — 在 `types.ts` 新增 `ImageI18nIssue`、`MaxlengthIssue`
3. ImageI18nChecker — 较简单，正则匹配
4. ImageI18nChecker 测试 — 10–12 个用例
5. MaxlengthChecker — 较简单，正则匹配
6. MaxlengthChecker 测试 — 10–12 个用例
7. 导出更新 — `index.ts`
8. CLI 集成 — `checkReactive.ts`
9. 完整构建 — `pnpm build`
10. 完整测试 — `pnpm --filter @i18n-tool/adapter-vue3 test` + `pnpm --filter @i18n-tool/core test`（隔离避免 Windows ENOTEMPTY）
11. 规格文档 — 两份 spec
12. 阶段总结 — `phase8.3-summary.md`

## 验收标准

- [ ] `ImageI18nChecker` 实现完成，所有测试通过
- [ ] `MaxlengthChecker` 实现完成，所有测试通过
- [ ] `ImageI18nIssue` 和 `MaxlengthIssue` 独立类型定义完成
- [ ] CLI `check-reactive` 命令正确输出新规则的检测结果（共 7 类问题）
- [ ] `pnpm build` 全部包构建成功
- [ ] adapter-vue3 测试全部通过（预计 143 + ~24 = ~167 个）
- [ ] 测试覆盖率 > 80%
- [ ] 规格文档完整：`ImageI18nChecker.md`、`MaxlengthChecker.md`
- [ ] `phase8.3-plan.md` 和 `phase8.3-summary.md` 落地到 `docs/development/`

## 验证步骤

实施完成后端到端验证：
```bash
# 1. 构建
cd d:/srcheng/i18n-automation-tool
pnpm build

# 2. 单包测试
pnpm --filter @i18n-tool/adapter-vue3 test

# 3.（可选）实际项目验证
node packages/cli/dist/index.js check-reactive D:/workSpace/spark_industry_master_frontends/src
```

预期：人类可读模式下能看到 `含中文图片资源未多语言化` 和 `表单 maxlength 未按语种适配` 两类提示；JSON 模式下有对应字段。

## 关键文件

**新增文件**：
- `packages/adapter-vue3/src/checker/imageI18nChecker.ts`
- `packages/adapter-vue3/src/checker/maxlengthChecker.ts`
- `packages/adapter-vue3/src/__tests__/imageI18nChecker.test.ts`
- `packages/adapter-vue3/src/__tests__/maxlengthChecker.test.ts`
- `docs/development/phase8.3-plan.md`
- `docs/development/phase8.3-summary.md`
- `docs/specs/adapter-vue3/ImageI18nChecker.md`
- `docs/specs/adapter-vue3/MaxlengthChecker.md`

**修改文件**：
- `packages/adapter-vue3/src/types.ts` — 新增 2 个 Issue 接口
- `packages/adapter-vue3/src/index.ts` — 添加 2 个 export + 2 个 type export
- `packages/cli/src/commands/checkReactive.ts` — 集成 2 个 checker

## 参考实现

**Template 解析骨架**：
- `packages/adapter-vue3/src/checker/templateConcatChecker.ts` — `descriptor.template.content` + 正则的最简模板

**独立 Issue 类型范本**：
- `packages/adapter-vue3/src/types.ts` 中的 `TemplateConcatIssue`、`ElementPlusIssue`

**测试模式**：
- `packages/adapter-vue3/src/__tests__/templateConcatChecker.test.ts`

**经验教训依据**：
- `docs/lessons-learned.md` 规则 14、规则 15

**实际项目对照提交**：
- `D:/workSpace/spark_industry_master_frontends` 提交 `a581a18a4`（maxlength 修复）、`ff7cc78d8`（图片切英文版）

## 后续计划（Phase 8.4，可选）

完成 Phase 8.3 后，剩余增强方向：

1. **CachedRefLocaleChecker 增强**（推迟自 Phase 8.2）
   - computed 间接引用追踪（`x.value = computedActions.value`）
   - 深层对象赋值（`x.value.list = [...]`）
   - 跨文件 composable 追踪

2. **后端枚举字段直渲检测**（误报率高，需配置驱动）
   - 配合 `.i18nrc.json` 白名单
   - 输出为 info 级别建议，非 warning

3. **原生 `<input maxlength>` 检测**（本期仅覆盖 Element Plus）

4. **图片模块导入识别**（`import banner from '@/assets/banner.png'` 后 `<img :src="banner">`）

至此 lessons-learned.md 19 条规则全部覆盖完毕，工具进入"按需增强 + bug 修复"维护期。Phase 8.4 是否启动由用户决定。
