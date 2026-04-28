# Phase 4: CLI 工具包开发计划

## 背景

core 包（Phase 1 + 2）和 adapter-vue3 包（Phase 3 + 3.5）已完成，提供了完整的扫描、翻译、质量检查、验证、Vue SFC 解析、代码替换、响应式检测能力。现在需要将这些能力封装为命令行工具，让用户可以直接在终端使用。

CLI 是工具链面向用户的第一个交互入口。

## 历史遗留任务

### 来自 Phase 3.5（低优先级，本期不处理）

| 规则 | 描述 | 未完成原因 |
|------|------|-----------|
| locale-code-format | locale code 格式校验 | 已有 ConfigValidator 的 BCP 47 校验 |
| factory-function-sync | 工厂函数同步问题检测 | 需要更多实战案例 |
| menu-key-semantic | 菜单 key 语义化检测 | 需要定义命名规范 |
| api-locale-watch | API 请求 locale 监听 | 需要分析 API 拦截器模式 |

### 来自分析报告（高优先级，本期处理）

| 任务 | 描述 |
|------|------|
| KeyIntegrityChecker | 跨语言 key 完整性检查（缺失/多余 key） |
| 扩展 ValidationIssue 类型 | 新增 missing_translation_key / extra_translation_key |

## 实现范围

### 本期实现

1. `scan` — 扫描硬编码中文、不可转换中文、重复翻译
2. `validate` — 验证配置 + 语言包 key 完整性
3. `report` — 生成覆盖率报告 + key 完整性统计
4. `check-reactive` — Vue 响应式问题检查
5. `check-quality` — 翻译质量检查
6. `check-layout` — CSS 多语言适配检查
7. `init` — 初始化配置文件

### 延后到后续迭代

1. `fix` — 自动修复（文件写回、确认交互、回滚策略）
2. `translate` — 批量翻译（API Key、缓存策略、外部服务）

## 命令结构

```bash
i18n-tool <command> [options]

Commands:
  scan [path]              扫描硬编码中文
  validate [path]          验证 i18n 配置和语言包完整性
  report [path]            生成覆盖率报告
  check-reactive [path]    检查 t() 响应式问题
  check-quality [path]     翻译质量检查
  check-layout [path]      CSS 多语言适配检查
  init                     初始化配置文件

Options:
  -c, --config <path>      配置文件路径（默认 .i18nrc.json）
  --json                   以 JSON 输出结果
  -v, --version            显示版本号
  -h, --help               显示帮助信息
```

## 模块设计

### CLI 入口 (`src/cli.ts`)
- 使用 `commander` 定义命令和全局选项
- 统一加载配置文件、错误处理、退出码

### 命令处理器 (`src/commands/`)
- `scan.ts` — ChineseScanner + UntranslatableDetector + DuplicateDetector
- `validate.ts` — ConfigValidator + KeyIntegrityChecker
- `report.ts` — CoverageReporter + checkKeyIntegrity
- `checkReactive.ts` — ReactiveChecker + TemplateConcatChecker
- `checkQuality.ts` — ChinglishChecker + RedundancyChecker + RtlChecker
- `checkLayout.ts` — LayoutChecker
- `init.ts` — inquirer 交互式生成 .i18nrc.json

### 工具模块 (`src/utils/`)
- `loadConfig.ts` — 配置文件读取和合并
- `logger.ts` — chalk 彩色输出
- `spinner.ts` — ora 进度显示
- `formatters.ts` — 文本/JSON 输出格式化
- `fileDiscovery.ts` — glob 文件收集

## 新增 core 模块

### KeyIntegrityChecker
- 以基准语言为准，检测其他语言包中缺失/多余的 key
- 递归提取嵌套对象的 key 路径
- 使用 Set 差集运算

### ValidationIssue 类型扩展
- 新增 `missing_translation_key` / `extra_translation_key`
- 新增 `locale` / `key` 可选字段

## 实施步骤

1. 扩展 core 验证能力（ValidationIssue + KeyIntegrityChecker + 测试）
2. 搭建 CLI 基础骨架（tsconfig + vitest + 入口 + 工具模块）
3. 实现首批命令（scan/validate/report/check-reactive/check-quality/check-layout/init）
4. 测试与文档

## 验证方式

```bash
cd packages/cli
pnpm build
node dist/cli.js --help
node dist/cli.js scan .
node dist/cli.js validate .
pnpm test
```
