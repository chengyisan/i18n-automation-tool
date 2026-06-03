# Phase 5.1 开发计划：MCP Server

## 阶段目标

将现有 CLI 能力封装为 MCP Server，为 Claude Code 提供 i18n 相关上下文工具。

## 技术方案

### 依赖关系

- 直接调用 `core` + `adapter-vue3` 模块（不依赖 CLI 包）
- 使用 `@modelcontextprotocol/sdk` 提供 MCP 协议支持
- stdio transport 与 Claude Code 通信

### 文件结构

```
packages/mcp-server/src/
├── index.ts                  # 入口（stdio transport）
├── server.ts                 # McpServer 实例 + tool 注册
├── types.ts                  # 内部类型定义
├── tools/
│   ├── scanHardcoded.ts      # 扫描硬编码中文
│   ├── validateSetup.ts      # 验证 i18n 配置完整性
│   ├── generateReport.ts     # 生成覆盖率报告
│   ├── checkReactive.ts      # 检查响应式问题
│   ├── checkQuality.ts       # 检查翻译质量
│   ├── checkLayout.ts        # 检查布局适配
│   └── initConfig.ts         # 生成配置文件
├── shared/
│   ├── loadConfig.ts         # 配置加载
│   ├── fileDiscovery.ts      # 文件发现
│   └── formatters.ts         # Markdown 格式化
└── __tests__/
    ├── tools/*.test.ts
    ├── shared/*.test.ts
    └── fixtures/
```

## Tool 函数映射（7 个）

| Tool 名称 | 描述 | 调用模块 |
|-----------|------|----------|
| `i18n_scan_hardcoded` | 扫描硬编码中文 | ChineseScanner + UntranslatableDetector + DuplicateDetector |
| `i18n_validate_setup` | 验证配置完整性 | ConfigValidator + keyIntegrity |
| `i18n_generate_report` | 覆盖率报告 | CoverageReporter + keyIntegrity |
| `i18n_check_reactive` | 响应式问题检测 | ReactiveChecker + TemplateConcatChecker |
| `i18n_check_quality` | 翻译质量检查 | ChinglishChecker + RedundancyChecker + RtlChecker + MenuKeyChecker |
| `i18n_check_layout` | 布局适配检查 | LayoutChecker |
| `i18n_init_config` | 生成配置文件 | 参数组装 |

## 关键设计决策

1. **复用策略**：直接调用 core/adapter-vue3 模块，不依赖 CLI（CLI 耦合了终端 UI）
2. **上下文**：所有 tool 通过 `path` 参数接收绝对路径，支持 `configPath` 显式指定配置
3. **输出格式**：统一返回 Markdown（表格/列表/code block），通过 `shared/formatters.ts` 格式化
4. **错误处理**：统一 try/catch 模式，返回 `isError: true` + 错误详情
5. **并发**：stdio 通信本身串行，暂不需要并发控制

## 开发步骤

| Step | 任务 | 预估 |
|------|------|------|
| 1 | 项目骨架搭建（tsconfig, vitest, index, server） | 1.5h |
| 2 | shared 模块（loadConfig, fileDiscovery, formatters） | 2h |
| 3 | scan + validate 工具 | 3h |
| 4 | report + checkReactive 工具 | 2.5h |
| 5 | checkQuality + checkLayout 工具 | 2h |
| 6 | initConfig 工具 | 1h |
| 7 | server.ts 注册 + 集成测试 | 2h |
| 8 | 文档和配置 | 1h |

**总计：约 15 小时**

## 历史遗留任务

| 来源 | 任务 | 优先级 |
|------|------|--------|
| Phase 4.5 | api-locale-watch 规则 | 低（推迟到 Phase 6） |
| Phase 4.5 | fix 命令 | 低（推迟到 Phase 6） |
| Phase 4.5 | translate 命令 | 低（推迟到 Phase 6） |

## 验收标准

- [ ] 7 个 tool 全部实现并通过测试
- [ ] `pnpm build` 构建成功
- [ ] `pnpm test` 全量测试通过
- [ ] MCP Server 可通过 stdio 正常启动
- [ ] 文档更新（README + 使用说明）
