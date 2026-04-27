# 文档重构说明

> 日期：2026-04-27  
> 操作：将单一 1616 行文档拆分为 7 个专题文档

## 重构原因

1. **提高可读性**：单一文档过长（1616 行），不便于快速查找信息
2. **减少 token 浪费**：开发时只需加载相关文档，而非整个文档
3. **便于维护**：各专题独立，更新时不影响其他部分
4. **按需查阅**：根据实际需求选择性阅读

## 新文档结构

```
docs/i18n-tool/
├── README.md                    # 主文档（概览和导航）- 264 行
├── technical-design.md          # 技术设计文档 - 506 行
├── special-cases.md             # 特殊场景处理指南 - 333 行
├── roi-analysis.md              # 工作量评估 - 161 行
├── cross-framework.md           # 跨框架适配分析 - 195 行
├── production-guide.md          # 生产环境实施指南 - 744 行
└── lessons-learned.md           # 经验教训 - 382 行

总计：2585 行（比原文档多 60%，因为增加了更多结构化内容）
```

## 文档映射关系

| 旧文档章节 | 新文档位置 |
|-----------|-----------|
| 背景、目标、已完成工作总结 | README.md |
| 核心能力需求、技术栈、实施阶段、配置示例 | technical-design.md |
| 不可转换的中文、公共翻译管理、RTL 布局 | special-cases.md |
| 工作量节省评估（4 个场景） | roi-analysis.md |
| 跨框架适配分析 | cross-framework.md |
| 生产环境实施考量（10 个维度） | production-guide.md |
| 经验教训（9 条规则） | lessons-learned.md |

## 使用建议

### 快速开始
1. 先阅读 [README.md](./README.md) 了解项目概况
2. 根据需求选择性阅读专题文档

### 开发时
- **技术实现**：只加载 [technical-design.md](./technical-design.md)
- **处理特殊场景**：只加载 [special-cases.md](./special-cases.md)
- **评估成本**：只加载 [roi-analysis.md](./roi-analysis.md)
- **跨框架扩展**：只加载 [cross-framework.md](./cross-framework.md)
- **生产部署**：只加载 [production-guide.md](./production-guide.md)
- **查阅最佳实践**：只加载 [lessons-learned.md](./lessons-learned.md)

### Token 节省估算

假设使用 Claude Code 开发工具：

| 场景 | 旧方案 | 新方案 | 节省 |
|------|--------|--------|------|
| 查看技术设计 | 加载 1616 行 | 加载 506 行 | **69%** |
| 查看特殊场景 | 加载 1616 行 | 加载 333 行 | **79%** |
| 查看 ROI 分析 | 加载 1616 行 | 加载 161 行 | **90%** |
| 查看跨框架适配 | 加载 1616 行 | 加载 195 行 | **88%** |
| 查看生产指南 | 加载 1616 行 | 加载 744 行 | **54%** |
| 查看经验教训 | 加载 1616 行 | 加载 382 行 | **76%** |

**平均节省约 76% 的 token**

## 旧文档处理

旧文档已备份为 `docs/i18n-automation-tool-plan.md.backup`，确认新文档无误后可删除。

```bash
# 删除备份文件
rm docs/i18n-automation-tool-plan.md.backup
```

## 维护指南

### 更新文档时

- **技术实现相关**：更新 `technical-design.md`
- **特殊场景处理**：更新 `special-cases.md`
- **成本和 ROI**：更新 `roi-analysis.md`
- **跨框架支持**：更新 `cross-framework.md`
- **生产部署**：更新 `production-guide.md`
- **最佳实践**：更新 `lessons-learned.md`
- **概览信息**：更新 `README.md`

### 添加新章节时

1. 判断属于哪个专题
2. 在对应文档中添加
3. 在 README.md 中更新导航链接（如需要）

## 文档质量检查

所有文档已包含：
- ✅ 清晰的标题和副标题
- ✅ 目录导航（长文档）
- ✅ 详细的表格和示例
- ✅ 相关文档链接
- ✅ 最后更新日期

## 反馈

如有文档结构或内容建议，请提出 issue 或直接修改。
