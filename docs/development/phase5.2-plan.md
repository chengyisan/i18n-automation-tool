# Phase 5.2 开发计划：Skill (Claude Code Commands)

## 阶段目标

在 `.claude/commands/` 目录下创建 i18n 相关的 slash commands，为用户提供交互式 i18n 工作流。

## 实现方式

Claude Code 的 Skill 本质是 Markdown prompt 文件，放在 `.claude/commands/` 目录下，
用户通过 `/command-name` 触发。Prompt 中引导 Claude 调用 MCP Server 的 tool。

## 计划创建的 Commands

| Command | 文件 | 功能 |
|---------|------|------|
| `/i18n-scan` | i18n-scan.md | 扫描硬编码中文，生成报告 |
| `/i18n-validate` | i18n-validate.md | 验证配置和 key 完整性 |
| `/i18n-report` | i18n-report.md | 生成覆盖率报告 |
| `/i18n-check` | i18n-check.md | 一键执行所有检查（响应式 + 质量 + 布局） |
| `/i18n-init` | i18n-init.md | 初始化 i18n 配置 |
| `/i18n-fix` | i18n-fix.md | 交互式修复硬编码中文（基于扫描结果） |

## 设计原则

1. 每个 command 引导 Claude 调用对应的 MCP tool
2. 输出结果后提供下一步建议
3. `/i18n-check` 为综合检查，一次调用多个 tool
4. `/i18n-fix` 为交互式工作流（扫描 → 逐个确认 → 替换）

## 文件结构

```
.claude/commands/
├── i18n-scan.md
├── i18n-validate.md
├── i18n-report.md
├── i18n-check.md
├── i18n-init.md
└── i18n-fix.md
```

## packages/skill 包处理

由于 Skill 实际是 Markdown 文件而非 TypeScript 模块，`packages/skill/` 包不再需要。
保留 package.json 但移除 build script 避免构建失败。
