# Phase 5.2 开发总结：Skill (Claude Code Commands)

## 完成时间
2026-06-04

## 阶段目标
在 `.claude/commands/` 目录下创建 i18n 相关的 slash commands，为用户提供交互式 i18n 工作流。

## 完成的任务清单

### 1. 6 个 Slash Commands ✅

| Command | 文件 | 功能 |
|---------|------|------|
| `/i18n-scan` | packages/skill/commands/i18n-scan.md | 扫描硬编码中文 |
| `/i18n-validate` | packages/skill/commands/i18n-validate.md | 验证配置和 key 完整性 |
| `/i18n-report` | packages/skill/commands/i18n-report.md | 生成覆盖率报告 |
| `/i18n-check` | packages/skill/commands/i18n-check.md | 综合检查（响应式+质量+布局） |
| `/i18n-init` | packages/skill/commands/i18n-init.md | 初始化配置文件 |
| `/i18n-fix` | packages/skill/commands/i18n-fix.md | 交互式修复硬编码中文 |

### 2. 安装脚本 ✅
- `packages/skill/scripts/install.js` — 将 commands 复制到目标项目的 `.claude/commands/`
- 支持 `npx @i18n-tool/skill install` 快速安装

### 3. packages/skill 包结构 ✅
- commands/ — 6 个 Markdown command 源文件
- scripts/ — install.js 安装脚本
- README.md — 使用文档
- package.json — 配置 bin 和 files 字段

### 3. 全量构建验证 ✅
- `pnpm build` 5 个包全部成功

## 设计亮点

### 1. Command 即 Prompt
每个 command 文件是一个 Markdown prompt，引导 Claude 调用对应的 MCP tool 并组织输出。
用户无需了解底层 tool 名称，直接通过 `/i18n-scan` 等直觉命令触发。

### 2. 工作流编排
- `/i18n-check` 组合调用 3 个 tool（reactive + quality + layout），一次性完成全面检查
- `/i18n-fix` 定义了完整的交互式修复流程（扫描→确认→替换→验证）
- 每个 command 结束后提供下一步建议，形成闭环

### 3. Key 命名规范
`/i18n-fix` 中内嵌了 key 命名规范（camelCase、模块分组、后缀约定），确保生成的 key 语义化。

## 文件结构

```
packages/skill/
├── commands/          # Command Markdown 源文件
│   ├── i18n-scan.md
│   ├── i18n-validate.md
│   ├── i18n-report.md
│   ├── i18n-check.md
│   ├── i18n-init.md
│   └── i18n-fix.md
├── scripts/
│   └── install.js     # 安装脚本
├── README.md
└── package.json

.claude/commands/      # 安装后的位置（不进版本控制）
├── i18n-scan.md
├── i18n-validate.md
├── i18n-report.md
├── i18n-check.md
├── i18n-init.md
└── i18n-fix.md
```

## 使用方式

用户安装 skill 到自己的项目：

```bash
# 在目标项目中运行
npx @i18n-tool/skill install

# 或
pnpm add -D @i18n-tool/skill
pnpm i18n-skill-install
```

安装后即可在 Claude Code 中使用 `/i18n-scan` 等命令。

## 经验教训

### Claude Code Skill 的本质
- Skill/Command 是 Markdown prompt 文件，不是 TypeScript 模块
- 放在 `.claude/commands/` 目录下，通过 `/command-name` 触发
- 通过 frontmatter 的 `description` 字段定义命令说明
- 可通过 `allowed-tools` 字段控制可用工具

## 下一步计划

### 历史遗留任务
- api-locale-watch 规则（推迟到 Phase 6）
- fix 命令 CLI 实现（推迟到 Phase 6）
- translate 命令 CLI 实现（推迟到 Phase 6）

### 后续方向
- Phase 6: fix/translate CLI 命令实现
- 实际项目验证：在真实 Vue 项目上测试 MCP Server + Commands 的工作流

## 验收标准

- [x] 6 个 slash commands 创建完成
- [x] packages/skill 构建问题修复
- [x] `pnpm build` 全量构建成功
- [x] 计划文档和总结文档完成

## 未完成的任务

无。Phase 5.2 计划全部完成。
