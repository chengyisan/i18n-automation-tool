# Phase 8.3 开发总结：P2 规则检测器实现

## 阶段目标

实现 lessons-learned.md 中规则 14（图片资源多语言切换）和规则 15（表单 maxlength 动态适配）对应的两个 P2 检测器，集成到 CLI 命令并完成测试。至此 lessons-learned.md 19 条规则全部覆盖。

## 完成的任务清单

- [x] 落地 Phase 8.3 计划文档：`docs/development/phase8.3-plan.md`
- [x] 在 `types.ts` 新增独立 Issue 类型 `ImageI18nIssue`、`MaxlengthIssue`（不扩展 `ReactiveIssue.type`）
- [x] 实现 `ImageI18nChecker`（`packages/adapter-vue3/src/checker/imageI18nChecker.ts`）
- [x] 实现 `MaxlengthChecker`（`packages/adapter-vue3/src/checker/maxlengthChecker.ts`）
- [x] 编写 ImageI18nChecker 单元测试（12 个用例）
- [x] 编写 MaxlengthChecker 单元测试（13 个用例）
- [x] 更新 adapter-vue3 包导出（checker + type）
- [x] 集成两个检测器到 `check-reactive` CLI 命令（共 7 类问题输出）
- [x] 编写规格文档：`ImageI18nChecker.md`、`MaxlengthChecker.md`
- [x] 完整构建通过（`pnpm build`）
- [x] 完整测试通过（adapter-vue3 168/168）
- [x] CLI 端到端验证（含中文图片 + 固定 maxlength 的 Vue 文件正确检出）

## 测试结果和覆盖率

### adapter-vue3 包
- **总测试**: 168 个（Phase 8.2 为 143 个，本期新增 25 个）
- **通过率**: 100%
- **新增测试用例**:
  - `imageI18nChecker.test.ts`: 12 个
  - `maxlengthChecker.test.ts`: 13 个

### 构建
- `pnpm build`: 5 个包全部成功，无 TypeScript 错误

### 端到端验证
构造含中文图片 `<img src="@/assets/欢迎.png">` 和固定 `<el-input maxlength="20">` 的 Vue 文件，运行：
```bash
node packages/cli/dist/cli.js check-reactive <dir> --json
```
JSON 输出中 `imageI18nIssues[0]` 与 `maxlengthIssues[0]` 均正确检出。

## 文件结构和代码量统计

### 新增文件
```
packages/adapter-vue3/src/checker/imageI18nChecker.ts          100 行
packages/adapter-vue3/src/checker/maxlengthChecker.ts           77 行
packages/adapter-vue3/src/__tests__/imageI18nChecker.test.ts   145 行
packages/adapter-vue3/src/__tests__/maxlengthChecker.test.ts   149 行
docs/development/phase8.3-plan.md
docs/development/phase8.3-summary.md（本文件）
docs/specs/adapter-vue3/ImageI18nChecker.md
docs/specs/adapter-vue3/MaxlengthChecker.md
```

实现代码：177 行；测试代码：294 行；测试代码占比 62%。

### 修改文件
- `packages/adapter-vue3/src/types.ts` — 新增 `ImageI18nIssue`、`MaxlengthIssue` 两个独立接口
- `packages/adapter-vue3/src/index.ts` — 添加 2 个 checker export + 2 个 type export
- `packages/cli/src/commands/checkReactive.ts` — 集成 2 个 checker、扩展 JSON 与人类可读输出至 7 类

## 设计亮点和技术细节

### 1. 独立 Issue 类型而非扩展联合类型

Phase 8.2 的两个 P1 检测器输出 `ReactiveIssue`（script 级响应式问题）。本期两个检测器是 **template 级** 问题，与响应式语义无关。经与用户确认，选择新增独立接口 `ImageI18nIssue`、`MaxlengthIssue`，而非继续扩展 `ReactiveIssue.type` 联合类型。

理由：
- 语义清晰——template 级资源/UI 问题与 script 级响应式问题不应混用同一类型
- `MaxlengthIssue` 需要额外字段 `currentValue`，扩展联合类型会让 `ReactiveIssue` 字段可选化、污染既有消费方
- 与 `TemplateConcatIssue`、`ElementPlusIssue` 的设计保持一致（template 级各有独立类型）

### 2. ImageI18nChecker — 三正则按优先级 + 区间去重

`:src="require('@/x.png')"` 形式的字符串里也含 `src="..."` 子串，单纯并列三个正则会让同一 `<img>` 被多次报告。实现用 `reportedRanges: [start, end][]` 跟踪已报告的字符区间，后续 pattern 命中已覆盖区间则跳过，保证每个 `<img>` 只报告一次。

### 3. ImageI18nChecker — 语言后缀豁免

文件名末尾已带明确语言标识（`_zh.png` / `_en.svg` / `-en.jpg` / `_zh-CN.png`）视为已多语言，正则 `/[_-](zh|en|cn|us|ar|ja|ko|fr|de|es|ru|pt|it)(?:[-_][a-zA-Z]+)?\.[a-zA-Z]+$/` 命中即跳过，避免对已处理资源误报。

### 4. MaxlengthChecker — 冒号前缀排除动态绑定

正则 `\bmaxlength\s*=\s*"(\d+)"` 中 `\b` 单词边界也会让 `:maxlength="20"` 命中。实现在匹配后检查 `maxlength` 前一字符是否为 `:`，是则跳过——动态绑定无法静态判断是否已适配，一律不报告。

### 5. MaxlengthChecker — 阈值过滤

`maxlength > 50` 视为开发者已为多语言预留余量，不报告；边界值 `50` 含入（`>` 而非 `>=`）。阈值依据：中文表单常见 maxlength 在 10-50 区间，长语种下风险最高。

### 6. 复用 template 检测骨架

两个检测器都复用 `templateConcatChecker.ts` 的"`sfcParse → descriptor.template.content → 正则 → 行号计算`"骨架，与 8.2 的 script 级 AST 检测互补。行号计算统一为 `startLine + 匹配前换行数`，正确处理 `<script>` 在前、`<template>` 在后的 SFC 结构。

### 7. CLI 输出扩展至 7 类

`check-reactive` 命令现支持 7 类问题：响应式、模板拼接、API locale、SSE/WebSocket、缓存 ref、含中文图片、表单 maxlength。每类独立计数与提示，JSON 模式各占一字段，退出码逻辑不变（issues > 0 → exit 1）。

## 经验教训

### 1. 后端枚举字段直渲检测主动跳过
计划阶段调研业务项目 commit `8ca8e506a` 后判定：仅靠字段名后缀（如 `xxxName`）无法区分"需翻译"与"不需翻译"的枚举字段（同文件中 `typeName` 不需改、`groupCategoryName` 需改），误报率过高。决定本期不实现该检测器，仅在文档层面补充模式说明。这印证了"宁可漏报不可高误报"的工具设计原则——高误报会让开发者对工具失去信任。

### 2. 正则共享对象的 lastIndex 必须每次重置
checker 实例长期持有 `patterns` 数组，多次 `check()` 调用间若不重置 `pattern.lastIndex`，`matchAll`/`exec` 会从上次位置继续，导致漏匹配。两个检测器均在每轮循环前 `pattern.lastIndex = 0`。

### 3. pnpm filter 传 vitest 参数需 `--` 分隔
`pnpm --filter @i18n-tool/adapter-vue3 test --run` 报 `Unknown option 'run'`，需写成 `pnpm --filter ... test -- --run`，`--` 之后的参数才会透传给底层 vitest。

### 4. CLI bin 入口确认
端到端验证时误用 `dist/index.js`，实际 package.json 的 bin 指向 `dist/cli.js`。验证 CLI 前应先确认 bin 字段。

## 验收标准检查

- [x] `ImageI18nChecker` 实现完成，所有测试通过（12/12）
- [x] `MaxlengthChecker` 实现完成，所有测试通过（13/13）
- [x] `ImageI18nIssue` 和 `MaxlengthIssue` 独立类型定义完成
- [x] CLI `check-reactive` 命令正确输出新规则的检测结果（共 7 类问题）
- [x] `pnpm build` 全部包构建成功
- [x] adapter-vue3 测试 168/168 通过
- [x] 测试覆盖率 > 80%（每个新检测器覆盖正常 + 异常 + 边界）
- [x] 规格文档完整：ImageI18nChecker.md、MaxlengthChecker.md
- [x] phase8.3-plan.md 和 phase8.3-summary.md 落地到 `docs/development/`

## 未完成的任务

无遗留任务。

## 下一步计划（Phase 8.4，可选）

lessons-learned.md 19 条规则已全部覆盖，工具进入"按需增强 + bug 修复"维护期。剩余增强方向（均为可选）：

1. **CachedRefLocaleChecker 增强**（推迟自 Phase 8.2）
   - computed 间接引用追踪（`x.value = computedActions.value`）
   - 深层对象赋值（`x.value.list = [...]`）
   - 跨文件 composable 追踪（项目级符号表）

2. **后端枚举字段直渲检测**（误报率高，需配置驱动）
   - 配合 `.i18nrc.json` 白名单
   - 输出为 info 级别建议，非 warning

3. **原生 `<input maxlength>` 检测**（本期仅覆盖 Element Plus）

4. **图片模块导入识别**（`import banner from '@/assets/欢迎.png'` 后 `<img :src="banner">`）

是否进入 Phase 8.4 由用户决定。

## 总结

Phase 8.3 交付了两个 P2 规则检测器，将 lessons-learned.md 规则 14/15 从经验文档转化为可执行的工具能力。两个检测器均复用 template 级检测骨架，与 Phase 8.2 的 script 级 AST 检测互补，工具链 template/script 双维度能力完整。

至此，工具链已覆盖 lessons-learned.md 全部 19 条规则：
- ✅ 规则 1-12（早期 phases）
- ✅ 规则 13、16、19（Phase 8.1，P0）
- ✅ 规则 17、18（Phase 8.2，P1）
- ✅ 规则 14、15（Phase 8.3，P2）

工具核心检测能力建设阶段告一段落。
