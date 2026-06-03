# Phase 5.1 开发总结：MCP Server

## 完成时间
2026-06-03

## 阶段目标
将现有 CLI 能力封装为 MCP Server，为 Claude Code 提供 i18n 相关上下文工具。

## 完成的任务清单

### 1. 项目骨架搭建 ✅
- tsconfig.json、vitest.config.ts
- src/index.ts（stdio transport 入口）
- src/server.ts（McpServer 实例 + 7 个 tool 注册）
- src/types.ts（内部类型定义）
- package.json 更新（bin、types、zod 依赖）

### 2. shared 共享模块 ✅
- `loadConfig.ts` — 递归查找 .i18nrc.json 配置
- `fileDiscovery.ts` — glob 文件发现
- `formatters.ts` — 6 个 Markdown 格式化函数

### 3. 7 个 MCP Tool ✅

| Tool | 文件 | 功能 |
|------|------|------|
| i18n_scan_hardcoded | scanHardcoded.ts | 扫描硬编码中文 |
| i18n_validate_setup | validateSetup.ts | 验证配置完整性 |
| i18n_generate_report | generateReport.ts | 覆盖率报告 |
| i18n_check_reactive | checkReactive.ts | 响应式问题检测 |
| i18n_check_quality | checkQuality.ts | 翻译质量检查 |
| i18n_check_layout | checkLayout.ts | 布局适配检查 |
| i18n_init_config | initConfig.ts | 生成配置文件 |

### 4. 测试 ✅
- 52 个测试用例全部通过
- 覆盖 shared 模块、7 个 tool、server 集成

### 5. 文档 ✅
- packages/mcp-server/README.md — 使用说明

## 测试结果和覆盖率

- **测试文件**: 9 个
- **测试用例**: 52 个
- **通过率**: 100%
- **覆盖范围**: formatters（20）、7 个 tool（30）、server 集成（2）

## 文件结构和代码量统计

```
packages/mcp-server/src/
├── index.ts                    (~15 行)
├── server.ts                   (~27 行)
├── types.ts                    (~30 行)
├── shared/
│   ├── loadConfig.ts           (~45 行)
│   ├── fileDiscovery.ts        (~25 行)
│   └── formatters.ts           (~385 行)
├── tools/
│   ├── scanHardcoded.ts        (~80 行)
│   ├── validateSetup.ts        (~65 行)
│   ├── generateReport.ts       (~50 行)
│   ├── checkReactive.ts        (~90 行)
│   ├── checkQuality.ts         (~130 行)
│   ├── checkLayout.ts          (~60 行)
│   └── initConfig.ts           (~80 行)
└── __tests__/
    ├── server.test.ts
    ├── shared/formatters.test.ts
    ├── tools/*.test.ts (7 个)
    └── fixtures/
```

**总代码量**: ~1100 行（实现）+ ~800 行（测试）

## 设计亮点和技术细节

### 1. Zod Schema 注册
MCP SDK 要求使用 Zod schema 而非 JSON Schema 注册 tool 参数。每个 tool 导出 `schema.inputSchema` 为 Zod 对象。

### 2. 统一错误处理模式
所有 tool handler 使用统一的 try/catch 模式，错误返回 `{ isError: true, content: [{ type: 'text', text: markdown }] }`。

### 3. 配置递归查找
`loadConfig` 从指定路径向上递归查找 `.i18nrc.json`，未找到时使用 `DEFAULT_CONFIG`，行为与 CLI 一致。

### 4. Markdown 格式化输出
所有 tool 返回 Markdown 格式文本，使用表格展示问题列表，限制每表 50 条避免输出过长。

### 5. 单文件/目录双模式
scan 和 checkReactive 支持单文件路径（直接处理）和目录路径（批量扫描）。

## 经验教训

### 1. MCP SDK API 变化
MCP SDK 的 `server.tool()` 注册方式需要 Zod schema 而非 JSON Schema。版本升级后 API 有变，需要检查实际类型定义。

### 2. checkKeyIntegrity 参数
`checkKeyIntegrity(localeDir, locales, baseLocale)` 需要 3 个独立参数，不接受 config 对象。

### 3. 编译产物污染
Sub-agent 编译时产生的 .js/.d.ts 文件混入 src/ 目录，需在 tsconfig 中确保 outDir 正确。

## 下一步计划

### Phase 5.2: Skill 开发
- 封装完整工作流为交互式技能
- /i18n-scan、/i18n-validate 等 slash 命令
- 工作流编排（扫描 → 预览 → 确认 → 验证）

### 历史遗留
- api-locale-watch 规则（推迟到 Phase 6）
- fix 命令（推迟到 Phase 6）
- translate 命令（推迟到 Phase 6）

## 验收标准

- [x] 7 个 tool 全部实现并通过测试
- [x] `pnpm build` 构建成功
- [x] `pnpm test` 52 个测试全部通过
- [x] MCP Server 可通过 stdio 正常启动
- [x] 文档更新（README + 使用说明）

## 未完成的任务

无。Phase 5.1 计划全部完成。
