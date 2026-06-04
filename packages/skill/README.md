# @i18n-tool/skill

i18n 自动化工具的 Claude Code Skill — 6 个 slash commands 提供交互式 i18n 工作流。

## 安装

### 方式 1: 通过 npx（推荐）

```bash
npx @i18n-tool/skill install
```

### 方式 2: 本地安装

```bash
pnpm add -D @i18n-tool/skill
pnpm i18n-skill-install
```

安装后，commands 文件将复制到项目的 `.claude/commands/` 目录。

## 可用命令

| Command | 功能 |
|---------|------|
| `/i18n-scan` | 扫描硬编码中文字符串、不可转换中文、重复翻译 |
| `/i18n-validate` | 验证 i18n 配置完整性和语言包 key 完整性 |
| `/i18n-report` | 生成 i18n 覆盖率报告 |
| `/i18n-check` | 一键执行所有检查（响应式+质量+布局） |
| `/i18n-init` | 初始化 i18n 配置文件 |
| `/i18n-fix` | 交互式修复硬编码中文 |

## 前置要求

需要先配置 MCP Server：

```json
{
  "mcpServers": {
    "i18n-tool": {
      "command": "npx",
      "args": ["@i18n-tool/mcp-server"]
    }
  }
}
```

## 使用流程

### 初始化项目

```bash
# 在 Claude Code 中运行
/i18n-init
```

### 扫描和修复

```bash
# 扫描硬编码中文
/i18n-scan

# 交互式修复
/i18n-fix
```

### 验证和检查

```bash
# 验证配置和 key 完整性
/i18n-validate

# 全面质量检查
/i18n-check

# 生成覆盖率报告
/i18n-report
```

## 目录结构

```
packages/skill/
├── commands/           # Command Markdown 源文件
│   ├── i18n-scan.md
│   ├── i18n-validate.md
│   ├── i18n-report.md
│   ├── i18n-check.md
│   ├── i18n-init.md
│   └── i18n-fix.md
├── scripts/
│   └── install.js      # 安装脚本
└── README.md
```
