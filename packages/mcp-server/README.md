# @i18n-tool/mcp-server

为 Claude Code 提供 i18n 自动化工具的 MCP Server。

## 安装

```bash
pnpm add @i18n-tool/mcp-server
```

## 配置

在 Claude Code 的 `settings.json` 中添加 MCP Server 配置：

```json
{
  "mcpServers": {
    "i18n-tool": {
      "command": "node",
      "args": ["path/to/packages/mcp-server/dist/index.js"]
    }
  }
}
```

## 可用工具

### i18n_scan_hardcoded

扫描硬编码中文字符串、不可转换中文、重复翻译。

**参数**：
- `path`（必填）：项目或目录的绝对路径
- `includeComments`（可选）：是否包含注释中的中文
- `configPath`（可选）：配置文件路径

### i18n_validate_setup

验证 i18n 配置完整性和语言包 key 完整性。

**参数**：
- `path`（必填）：项目根路径
- `configPath`（可选）：配置文件路径

### i18n_generate_report

生成 i18n 覆盖率报告。

**参数**：
- `path`（必填）：项目根路径
- `configPath`（可选）：配置文件路径

### i18n_check_reactive

检查 Vue 文件中的 t() 响应式问题和模板拼接问题。

**参数**：
- `path`（必填）：项目路径或单个 .vue 文件路径
- `configPath`（可选）：配置文件路径

### i18n_check_quality

检查翻译质量（中式英语、冗余表达、RTL 拼接问题）。

**参数**：
- `path`（必填）：项目路径或语言包目录
- `locale`（可选）：指定检查的语言代码
- `configPath`（可选）：配置文件路径

### i18n_check_layout

检查 CSS 固定宽度/高度等多语言布局适配问题。

**参数**：
- `path`（必填）：项目路径
- `configPath`（可选）：配置文件路径

### i18n_init_config

生成 .i18nrc.json 配置文件内容（返回 JSON，不写盘）。

**参数**：
- `path`（必填）：项目根路径
- `locales`（可选）：支持的语言列表，默认 `["zh-CN", "en-US"]`
- `defaultLocale`（可选）：默认语言，默认 `"zh-CN"`
- `langDir`（可选）：语言包目录，默认 `"src/lang"`
- `enableQualityChecks`（可选）：启用质量检查
- `enableReactiveChecks`（可选）：启用响应式检查

## 开发

```bash
pnpm dev     # watch 模式
pnpm build   # 构建
pnpm test    # 运行测试
```
