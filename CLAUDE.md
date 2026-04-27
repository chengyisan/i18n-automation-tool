# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

国际化自动化工具 — 扫描、替换、翻译、验证一站式 i18n 工具链。基于 152+ 次实际 i18n 改造提交经验提炼的自动化工具。

**目标**: 将手动 i18n 改造流程自动化，节省 75-90% 的工作量。

**三种形态**:
- **CLI 工具**: 独立命令行工具，可集成到 CI/CD
- **MCP Server**: 为 Claude Code 提供 i18n 相关工具
- **Skill**: 交互式 Claude Code 技能

## 技术栈

- **语言**: TypeScript (ES2022)
- **包管理**: pnpm (>=9.0.0) + pnpm workspace
- **构建工具**: Turbo (monorepo 构建)
- **测试框架**: Vitest
- **代码质量**: ESLint + Prettier
- **AST 解析**: @babel/parser, @babel/traverse, @vue/compiler-sfc, jscodeshift
- **CLI 交互**: commander, inquirer, chalk, ora
- **MCP**: @modelcontextprotocol/sdk
- **数据库**: better-sqlite3 (翻译缓存)

## Monorepo 架构

```
packages/
├── core/              # 核心层 — 框架无关的扫描、翻译、质量检查、验证
├── adapter-vue3/      # Vue 3 适配器 — AST 解析、代码替换、响应式检测
├── cli/               # CLI 工具
├── mcp-server/        # MCP Server
└── skill/             # Claude Code Skill
```

**依赖关系**:
- `cli`, `mcp-server`, `skill` 依赖 `core` + `adapter-vue3`
- `adapter-vue3` 依赖 `core`
- `core` 无外部依赖（框架无关）

## 常用命令

### 开发
```bash
pnpm install          # 安装依赖
pnpm dev              # 启动所有包的 watch 模式
pnpm build            # 构建所有包
pnpm test             # 运行所有测试
pnpm lint             # 代码检查
pnpm clean            # 清理构建产物
```

### 单包开发
```bash
cd packages/core
pnpm dev              # 仅 watch core 包
pnpm test             # 仅测试 core 包
```

## 核心能力

### 1. 代码分析 (core + adapter-vue3)
- AST 解析 Vue/JS/TS 文件
- 识别硬编码中文（排除变量名、注释、URL）
- 识别不可转换的中文（后端 value、图片/SVG 文字）
- 识别 t() 响应式问题（静态对象中的 t() 调用）
- 识别可复用的公共翻译

### 2. 项目结构理解 (core)
- 自动定位 i18n 配置文件
- 识别 monorepo 结构
- 分析共享包依赖关系
- 识别 shared-i18n 与应用本地翻译的关系

### 3. 代码生成 (adapter-vue3)
- 生成语义化 i18n key（如 `editorCore.pleaseSelect`）
- 替换硬编码为 t() 调用
- 自动添加 useI18n() 导入
- 为 createApp 添加 .use(i18n)
- 将含 t() 的静态对象改为 computed/工厂函数

### 4. 翻译能力 (core)
- 集成翻译 API（Google Translate / DeepL）
- 批量翻译并更新所有语言包
- 保留插值变量格式
- 翻译质量检查（中式英语、冗余表达、RTL 拼接问题）

### 5. 验证能力 (core)
- 检查 i18n 安装完整性
- 检查语言包完整性
- 生成覆盖率报告
- 检查 CSS 固定宽度适配
- 检测不可转换的中文
- 检测重复翻译 key

## 关键设计原则

### 响应式规则（重要！）
**规则**: `t()` 返回值禁止直接赋给 `ref`/变量，必须用 `computed` 或 `watch(locale)`

```javascript
// ❌ 错误
const title = ref(t('common.title'))
const options = [{ label: t('common.yes'), value: 1 }]

// ✅ 正确
const title = computed(() => t('common.title'))
const options = computed(() => [{ label: t('common.yes'), value: 1 }])
```

### locale code 格式
必须使用项目实际注册的 locale code。推荐使用 BCP 47 标准格式（如 `zh-CN`/`en-US`），但要与项目实际配置保持一致。

### 不可转换的中文
以下场景的中文不应转换为 i18n：
- 与后端交互的 value 值（枚举值、状态码）
- 图片中的中文文字（需替换为多语言图片资源）
- SVG 中的中文文字（需提取为 i18n 或替换为多语言 SVG）

## 代码规范

- 函数式优先，避免使用 class（除非框架要求）
- 变量名语义化，不用缩写
- 提前返回减少嵌套
- 所有公开 API 必须有类型注解
- 注释解释"为什么"，不解释"是什么"
- 注释使用中文

## 文档结构

```
docs/
├── technical-design.md    # 技术设计文档
├── special-cases.md       # 特殊场景处理指南
├── roi-analysis.md        # 工作量评估
├── cross-framework.md     # 跨框架适配分析
├── production-guide.md    # 生产环境实施指南
├── lessons-learned.md     # 经验教训（152+ 次提交总结）
├── specs/                 # 规格说明文档
│   └── core/              # core 包的规格文档
│       ├── ConfigLoader.md
│       ├── ChineseScanner.md
│       └── UntranslatableDetector.md
└── development/           # 开发总结文档
    └── phase1-summary.md  # Phase 1 开发总结
```

### 开发总结规范

每个开发阶段（Phase）完成后，必须创建总结文档到 `docs/development/` 目录：

**文件命名**: `phaseN-summary.md`（N 为阶段编号）

**必须包含的内容**:
1. 完成的任务清单
2. 测试结果和覆盖率
3. 文件结构和代码量统计
4. 设计亮点和技术细节
5. 经验教训
6. 下一步计划
7. 验收标准

**示例**: `docs/development/phase1-summary.md` - Phase 1 (core 包基础模块) 的完整总结

## 开发注意事项

1. **修改前先看计划**: 任何修改前先给出计划，等待确认
2. **小范围修改**: 每次修改范围尽量小，不要顺手改不相关的东西
3. **不确定先问**: 遇到不确定的决策，先问，不要自己猜
4. **阅读经验教训**: 开发前务必阅读 `docs/lessons-learned.md`，避免重复踩坑
5. **类型优先**: 所有核心类型定义在 `packages/core/src/types.ts`
6. **阶段性总结**: 每个开发阶段完成后，必须创建总结文档并落地到 `docs/development/` 目录

## 测试策略

- 单元测试覆盖核心逻辑（scanner, translator, validator）
- 集成测试覆盖完整工作流
- 使用真实 Vue 文件作为测试用例
- 测试响应式问题检测的准确性

## 参考资源

- README.md: 项目概述和快速开始
- docs/technical-design.md: 详细技术设计
- docs/lessons-learned.md: 从 152+ 次提交中总结的规则（必读）
