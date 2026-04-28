# 国际化自动化工具开发计划

> 最后更新：2026-04-27  
> 基于实际 i18n 改造项目的经验  
> 状态：Phase 1-3 已完成，Phase 4 待启动

## 📚 文档导航

- **[技术设计文档](./docs/technical-design.md)** - 技术栈、核心流程、配置示例、实施阶段
- **[特殊场景处理指南](./docs/special-cases.md)** - 不可转换的中文、公共翻译管理、RTL 布局
- **[工作量评估](./docs/roi-analysis.md)** - 4 个场景的详细评估、投入产出比分析
- **[跨框架适配分析](./docs/cross-framework.md)** - 框架差异对比、复用率评估、架构设计
- **[生产环境实施指南](./docs/production-guide.md)** - 安全性、版本控制、团队协作、性能优化
- **[经验教训](./docs/lessons-learned.md)** - 从实际改造中总结的规则和最佳实践

---

## 概述

基于 2025-01-16 至 2026-04-27 完成的 i18n 改造工作（152+ 次提交），计划将手动流程提炼为自动化工具。

### 背景

手动处理国际化问题耗时且容易遗漏：
- 扫描硬编码中文字符串
- 生成 i18n key 并更新语言包
- 替换代码中的硬编码为 t() 调用
- 修复 createApp 实例缺少 .use(i18n)
- 翻译到多语言（en, es, ar）
- 验证 i18n 配置完整性

### 目标

开发三种形态的工具：
1. **CLI 工具**：独立命令行工具，可集成到 CI/CD
2. **MCP Server**：为 Claude Code 提供 i18n 相关工具
3. **Skill**：交互式 Claude Code 技能

---

## 已完成工作总结

截至 2026-04-27，实际 i18n 改造项目已累计 **152+ 次提交**，完成以下工作：

### ✅ 基础架构
- 创建 `packages/shared-i18n` 共享包
- 各子应用接入 shared-i18n 并合并翻译
- Element Plus 国际化接入（ElConfigProvider 响应式 locale）
- 主子应用语言切换同步（CustomEvent 机制）

### ✅ 硬编码中文替换
- main 应用 — 硬编码替换完成
- report 应用 — 硬编码替换完成
- deep-research 应用 — 硬编码替换完成
- information-source 应用 — 硬编码替换完成

### ✅ 响应式布局改造
- Phase 3: 表格列宽改造（固定宽度 → min-width 适配多语言）
- Phase 4: CSS 固定宽度响应式改造（useI18nWidth）

### ✅ i18n 响应式修复
- 修复静态对象/数组中 t() 不响应语种切换的问题
- 修复 JSX 列配置的 i18n 响应式问题
- 修复 Qiankun 子应用 i18n 初始化时序问题
- 修复独立 createApp 实例缺失 i18n 的问题

### ✅ spark-agent 国际化
- spark-agent i18n 改造，使用 shared-i18n
- 向 DeerFlow iframe 传递 locale

### ✅ 翻译质量优化
- 全局英文翻译优化 — 精简冗余表达、修正中式英语
- 西班牙语翻译优化 — 修复语法错误、去掉波浪号/感叹号
- 阿拉伯语翻译优化 — 精简冗余表达、修复 RTL 拼接问题

### ⚠️ 阿拉伯语 RTL 布局适配（未完成）
- 阿语翻译文案已完成，但 **RTL 布局适配尚未实施**
- 涉及：文字方向、镜像布局、图标翻转、对齐方式、padding/margin 方向等
- 详见 [特殊场景处理指南](./special-cases.md#3-语种特殊化处理)

### ✅ 其他修复
- 菜单翻译 key 从中文 name 改为路由 id 语义化 key
- 全局 axios 请求添加 Accept-Language / language header
- 重复翻译 key 合并至 shared-i18n
- 爬取字段列表改为 API 动态获取替代硬编码 i18n
- 侧边栏名称图片支持多语种切换

---

## 核心能力（概览）

详细说明见 [技术设计文档](./technical-design.md#核心能力需求)

1. **代码分析**：AST 解析、识别硬编码中文、识别不可转换的中文、识别响应式问题
2. **项目结构理解**：自动定位配置、识别 monorepo、识别可复用翻译
3. **代码生成**：生成语义化 key、替换硬编码、修复响应式问题
4. **翻译能力**：集成翻译 API、批量翻译、质量检查、语种特殊化处理
5. **验证能力**：检查配置完整性、检查布局适配、检测不可转换中文、检测重复 key
6. **交互能力**：CLI 工具、MCP Server、Claude Code Skill

---

## 价值和 ROI

详细分析见 [工作量评估](./roi-analysis.md)

### 工作量节省

| 场景 | 无工具工时 | 有工具工时 | 节省比例 |
|------|-----------|-----------|---------|
| 从 0 开始新项目 | 20-40 小时 | 3-6 小时 | **85-90%** |
| 已有项目改造 | 234-332 小时 | 49-83 小时 | **75-80%** |
| 日常维护迭代 | 20-40 小时/月 | 4-8 小时/月 | **75-85%** |
| 多项目复用 | 650+ 小时 | 140-200 小时 | **70-80%** |

### 投入产出比

- **开发成本**：200-280 小时（5-7 周）
- **回本周期**：单个大型项目改造即可回本
- **长期价值**：5 年累计节省 1500-2500 小时（**投入的 7-12 倍**）

---

## 适用场景

- Vue 3 + vue-i18n 项目
- Monorepo 多应用架构
- 需要支持多语言的项目
- 存在大量硬编码中文的遗留项目
- 需要翻译质量检查的项目
- 需要 i18n 响应式问题检测的项目

**跨框架支持**：详见 [跨框架适配分析](./cross-framework.md)

---

## 后续计划

1. **短期**：根据项目优先级决定 Phase 4 的启动时间
2. **中期**：先开发 MCP Server + Skill（与 Claude Code 深度集成，投入产出比最高）
3. **长期**：开发独立 CLI 工具，支持 CI/CD 集成

### 开发优先级

**Phase 4.1 - MCP Server（优先级：高）**
- 暴露 i18n 相关工具给 Claude Code
- 自动分析上下文，减少手动指定路径
- 直接在 Claude Code 会话中调用

**Phase 4.2 - Claude Code Skill（优先级：高）**
- 封装完整的 i18n 改造工作流
- 交互式选择、预览、确认
- 自动调用 MCP Server 工具

**Phase 4.3 - CLI 工具（优先级：中）**
- 将扫描/修复/验证逻辑封装为 Node.js CLI
- 支持配置文件（.i18nrc.json）定义项目规则
- 集成到 CI/CD（可在 pre-commit 或 PR check 中运行）

---

## 参考案例

本次 i18n 改造工作涉及：
- 创建 shared-i18n 共享包，统一管理公共翻译
- 5 个应用（main + 3 子应用 + spark-agent）完成国际化
- 3 个子应用 qiankun.js 调整
- 9 个独立 createApp 实例修复
- 菜单翻译 key 语义化改造
- 多轮翻译质量优化（英/西/阿）
- CSS 响应式布局适配
- 表格列宽多语言适配
- 大量 t() 响应式问题修复

这些操作的模式已被充分验证，可以提炼为自动化工具。

---

## 快速开始

### 查看详细文档

- **技术实现**：查看 [技术设计文档](./docs/technical-design.md)
- **特殊场景**：查看 [特殊场景处理指南](./docs/special-cases.md)
- **成本评估**：查看 [工作量评估](./docs/roi-analysis.md)
- **跨框架**：查看 [跨框架适配分析](./docs/cross-framework.md)
- **生产部署**：查看 [生产环境实施指南](./docs/production-guide.md)
- **最佳实践**：查看 [经验教训](./docs/lessons-learned.md)

### CLI 使用示例

```bash
# 扫描硬编码中文
i18n-tool scan --path apps/report

# 自动修复（添加 i18n 调用）
i18n-tool fix --path apps/report --auto-translate

# 验证 i18n 配置
i18n-tool validate

# 生成翻译报告
i18n-tool report

# 检查 t() 响应式问题
i18n-tool check-reactive --path apps/report

# 翻译质量检查
i18n-tool quality --locale en --check chinglish,redundant

# 检查 CSS 多语言适配
i18n-tool check-layout --path apps/report

# 检测不可转换的中文
i18n-tool detect-untranslatable --path apps/report

# 检测重复翻译 key
i18n-tool detect-duplicates --suggest-shared
```

### MCP Server 工具

- `scan_hardcoded_strings` - 扫描硬编码字符串
- `fix_i18n_issues` - 自动修复 i18n 问题
- `validate_i18n_setup` - 验证 i18n 配置
- `translate_strings` - 批量翻译字符串
- `check_reactive_issues` - 检查 t() 响应式问题
- `check_translation_quality` - 翻译质量检查
- `detect_untranslatable` - 检测不可转换的中文
- `detect_duplicate_keys` - 检测重复翻译 key

---

## 贡献指南

欢迎贡献代码、文档或提出建议！

### 文档结构

```
docs/
├── technical-design.md          # 技术设计文档
├── special-cases.md             # 特殊场景处理指南
├── roi-analysis.md              # 工作量评估
├── cross-framework.md           # 跨框架适配分析
├── production-guide.md          # 生产环境实施指南
└── lessons-learned.md           # 经验教训
```

### 更新文档

- 技术实现相关：更新 `docs/technical-design.md`
- 特殊场景处理：更新 `docs/special-cases.md`
- 成本和 ROI：更新 `docs/roi-analysis.md`
- 跨框架支持：更新 `docs/cross-framework.md`
- 生产部署：更新 `docs/production-guide.md`
- 最佳实践：更新 `docs/lessons-learned.md`

---

## 许可证

内部项目，仅供公司内部使用。
