# 生产环境实施指南

**国际化自动化工具 - 安全性、性能与团队协作**

最后更新：2026-04-27

---

工具开发完成后，实际落地时需要考虑以下关键问题。

## 1. 安全性和隐私保护

### 数据外传风险

翻译 API 可能泄露敏感信息：

- 产品名称、功能描述
- 内网 IP、服务器地址
- 员工信息、客户信息
- 业务逻辑和数据结构

### 4 种解决方案

**方案 1：本地翻译模型**

使用开源模型（如 Llama、ChatGLM）部署在内网，完全避免数据外传。

- 优点：安全性最高
- 缺点：翻译质量可能不如商业 API，需要 GPU 资源

**方案 2：脱敏处理**

翻译前自动替换敏感信息为占位符，翻译后还原。

```javascript
// 示例
"连接到 192.168.1.100 失败" 
→ "连接到 [IP_1] 失败" 
→ 翻译 
→ "Failed to connect to [IP_1]"
→ "Failed to connect to 192.168.1.100"
```

**方案 3：白名单机制**

只允许特定类型的文案发送到外部 API（如 UI 按钮文本、提示信息），其余走本地模型。

**方案 4：混合模式**

结合以上方案，根据文案敏感等级自动选择翻译通道。

### 配置示例

```javascript
// i18n-tool.config.js
module.exports = {
  security: {
    // 翻译模式：local | cloud | hybrid
    translationMode: 'hybrid',
    
    // 敏感信息匹配规则
    sensitivePatterns: [
      /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,  // IP 地址
      /[\w.-]+@[\w.-]+\.\w+/,                   // 邮箱
      /1[3-9]\d{9}/,                             // 手机号
      /[\u4e00-\u9fa5]{2,4}(先生|女士|经理)/,    // 人名+称呼
    ],
    
    // 是否需要人工审批才能发送到外部 API
    requireApproval: true,
    
    // 审计日志
    auditLog: {
      enabled: true,
      path: './logs/translation-audit.log',
      retention: '90d'
    }
  }
}
```

### 合规建议

- **GDPR**：如果涉及欧洲用户数据，确保翻译 API 符合 GDPR 要求
- **数据分类**：建立文案敏感等级分类（公开、内部、机密）
- **审计追踪**：记录每次翻译请求的内容、时间、目标 API

## 2. 版本控制和回滚机制

### 问题

工具可能一次修改几百个文件，如果翻译质量有问题或引入 bug，需要快速回滚。

### Git 集成策略

- **自动分支管理**：每次运行工具自动创建 `i18n/auto-<timestamp>` 分支
- **分阶段提交**：按模块或按语言分别提交，方便部分回滚
- **变更报告生成**：自动生成本次修改的统计报告（新增/修改/删除的 key 数量）

### 回滚机制

- **一键回滚**：`i18n-tool rollback --to <commit-hash>` 回滚到指定版本
- **安全检查**：回滚前检查是否有手动修改的翻译会被覆盖

### 配置示例

```javascript
module.exports = {
  versionControl: {
    // 自动创建分支
    autoBranch: true,
    branchPrefix: 'i18n/auto-',
    
    // 分阶段提交
    commitStrategy: 'by-module', // by-module | by-language | single
    
    // 变更报告
    changeReport: {
      enabled: true,
      format: 'markdown', // markdown | json | html
      output: './reports/i18n-changes/'
    },
    
    // 回滚保护
    rollback: {
      // 回滚前备份当前状态
      backupBeforeRollback: true,
      // 保护手动修改的翻译
      protectManualEdits: true
    }
  }
}
```

## 3. 增量更新和持续维护

### 增量扫描

只扫描 `git diff` 中变更的文件，避免全量扫描：

```bash
# 只处理本次 PR 中修改的文件
i18n-tool scan --incremental --base main

# 只处理最近一次提交的变更
i18n-tool scan --incremental --since HEAD~1
```

### 死代码检测

识别翻译文件中未被任何代码引用的 key：

```bash
# 检测未使用的翻译 key
i18n-tool detect-unused --locale zh-CN

# 自动清理（需确认）
i18n-tool cleanup --unused --dry-run
```

### 翻译文件冲突解决

- **自动合并**：相同 key 的不同翻译，保留最新版本
- **按模块拆分**：将大的翻译文件拆分为模块级别，减少冲突概率

### 配置示例

```javascript
module.exports = {
  maintenance: {
    // 增量扫描
    incremental: {
      enabled: true,
      baseBranch: 'main'
    },
    
    // 死代码检测
    unusedDetection: {
      enabled: true,
      // 排除动态 key（如 t(`status.${code}`)）
      ignoreDynamicKeys: true,
      ignorePatterns: ['status.*', 'error.*']
    },
    
    // 翻译文件拆分策略
    fileSplitting: {
      strategy: 'by-module', // by-module | by-feature | single
      maxKeysPerFile: 200
    }
  }
}
```

## 4. 团队协作和审核流程

### 问题

机翻质量参差不齐，需要专业翻译审核。如何在自动化和人工审核之间找到平衡？

### 翻译状态管理

引入翻译状态机制：

- **draft**：机器翻译初稿
- **review**：待人工审核
- **approved**：审核通过
- **published**：已发布到生产环境

### 审核工作流

```bash
# 1. 工具生成初稿（状态：draft）
i18n-tool translate --status draft

# 2. 导出待审核清单
i18n-tool export-review --locale zh-CN --output review.xlsx

# 3. 翻译人员在 Excel 中审核修改

# 4. 导入审核后的翻译（状态：approved）
i18n-tool import-review --file review.xlsx --status approved

# 5. 发布到生产环境
i18n-tool publish --locale zh-CN
```

### 锁定机制

保护审核中和已批准的翻译，避免被工具覆盖：

```javascript
// 翻译文件中标记状态
{
  "login.title": {
    "zh-CN": "登录",
    "en-US": "Login",
    "_meta": {
      "status": "approved",
      "reviewer": "张三",
      "reviewedAt": "2026-04-20",
      "locked": true
    }
  }
}
```

### 配置示例

```javascript
module.exports = {
  collaboration: {
    // 翻译状态管理
    statusTracking: {
      enabled: true,
      defaultStatus: 'draft',
      allowedTransitions: {
        draft: ['review', 'approved'],
        review: ['draft', 'approved'],
        approved: ['published'],
        published: ['review'] // 允许重新审核
      }
    },
    
    // 审核工作流
    reviewWorkflow: {
      // 导出格式
      exportFormat: 'xlsx', // xlsx | csv | json
      // 导出时包含上下文信息
      includeContext: true,
      // 导入时验证规则
      importValidation: {
        checkDuplicates: true,
        checkPlaceholders: true,
        checkLength: true
      }
    },
    
    // 锁定机制
    locking: {
      // 自动锁定已审核的翻译
      autoLockApproved: true,
      // 覆盖锁定的翻译需要确认
      requireConfirmation: true
    }
  }
}
```

## 5. 性能和规模优化

### 大型项目性能问题

- **10000+ 文件扫描慢**：单线程扫描耗时 10+ 分钟
- **翻译 API 速率限制**：每秒最多 10 次请求
- **内存占用高**：大量 AST 解析占用内存

### 并行扫描

使用 worker threads 并行扫描文件：

```javascript
// 性能对比
// 单线程：10000 文件 → 12 分钟
// 8 线程：10000 文件 → 1.8 分钟（提升 6.7 倍）
```

### 翻译缓存

使用 SQLite 缓存已翻译的文本：

```javascript
// 缓存命中率
// 首次运行：0%
// 增量更新：70-80%（大部分文案未变）
```

### 批量翻译

合并多个短文本为一次请求：

```javascript
// 性能对比
// 逐条翻译：100 条 → 10 秒（受速率限制）
// 批量翻译：100 条 → 2.5 秒（提升 4 倍）
```

### 速率限制处理

自动重试和队列管理：

```javascript
// 遇到 429 错误时自动重试
// 使用指数退避策略：1s → 2s → 4s → 8s
```

### 配置示例

```javascript
module.exports = {
  performance: {
    // 并行扫描
    scanning: {
      workers: 8, // worker 线程数
      chunkSize: 100, // 每个 worker 处理的文件数
      memoryLimit: '2GB' // 单个 worker 内存限制
    },
    
    // 翻译缓存
    cache: {
      enabled: true,
      type: 'sqlite', // sqlite | redis | memory
      path: './.i18n-cache/translations.db',
      ttl: '30d' // 缓存过期时间
    },
    
    // 批量翻译
    batching: {
      enabled: true,
      maxBatchSize: 50, // 每批最多 50 条
      maxBatchLength: 5000 // 每批最多 5000 字符
    },
    
    // 速率限制
    rateLimit: {
      maxRequestsPerSecond: 10,
      retryStrategy: 'exponential', // exponential | linear | fixed
      maxRetries: 5
    }
  }
}
```

## 6. 测试和验证策略

### 工具本身的测试

- **单元测试**：扫描器、转换器、翻译器各模块独立测试
- **集成测试**：端到端测试完整流程
- **快照测试**：对比修改前后的代码差异

### 修改后的代码验证

- **语法检查**：运行 ESLint 确保没有语法错误
- **类型检查**：运行 TypeScript 编译器检查类型
- **功能测试**：运行项目的单元测试和 E2E 测试

### 配置示例

```javascript
module.exports = {
  testing: {
    // 工具自身测试
    selfTest: {
      unit: 'vitest',
      integration: 'vitest',
      snapshot: true
    },
    
    // 修改后验证
    postModification: {
      // 语法检查
      lint: {
        enabled: true,
        command: 'npm run lint',
        failOnError: true
      },
      
      // 类型检查
      typeCheck: {
        enabled: true,
        command: 'npm run type-check',
        failOnError: true
      },
      
      // 功能测试
      test: {
        enabled: false, // 默认关闭（耗时长）
        command: 'npm run test',
        failOnError: true
      }
    },
    
    // 快照对比
    snapshot: {
      enabled: true,
      output: './reports/snapshots/',
      diffTool: 'git diff' // git diff | diff | custom
    }
  }
}
```

## 7. 边界情况处理

### 动态生成的文案

**模板字符串拼接**

```javascript
// 不推荐（难以提取）
const msg = `用户 ${name} 的订单 ${orderId} 已完成`

// 推荐（使用插值）
const msg = t('order.completed', { name, orderId })
// zh-CN: "用户 {name} 的订单 {orderId} 已完成"
// en-US: "Order {orderId} for user {name} is completed"
```

**条件拼接**

```javascript
// 不推荐
const msg = isSuccess ? '成功' : '失败'

// 推荐
const msg = t(isSuccess ? 'common.success' : 'common.failure')
```

**数组拼接**

```javascript
// 不推荐
const msg = items.map(i => i.name).join('、')

// 推荐（使用 Intl.ListFormat）
const msg = new Intl.ListFormat('zh-CN').format(items.map(i => i.name))
```

### 第三方库配置中的文案

**ECharts 配置**

```javascript
// 不推荐（硬编码）
option = {
  title: { text: '销售趋势' },
  xAxis: { name: '月份' },
  yAxis: { name: '销售额' }
}

// 推荐（使用 computed）
const option = computed(() => ({
  title: { text: t('chart.salesTrend') },
  xAxis: { name: t('chart.month') },
  yAxis: { name: t('chart.sales') }
}))
```

**表单校验**

```javascript
// 不推荐
rules: {
  username: [{ required: true, message: '请输入用户名' }]
}

// 推荐
const rules = computed(() => ({
  username: [{ required: true, message: t('form.usernameRequired') }]
}))
```

### 枚举和映射表

区分显示文案和后端 value：

```javascript
// 不推荐（混淆）
const statusMap = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成'
}

// 推荐（分离）
const STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed'
}

const statusLabels = computed(() => ({
  [STATUS.PENDING]: t('status.pending'),
  [STATUS.PROCESSING]: t('status.processing'),
  [STATUS.COMPLETED]: t('status.completed')
}))
```

## 8. 成本控制

### 翻译成本预估

扫描后先估算成本，避免意外高额账单：

```bash
# 扫描并估算成本
i18n-tool scan --estimate-cost

# 输出示例
# 发现 1,234 条待翻译文案
# 预计字符数：45,678
# 预计成本（GPT-4）：$2.28
# 预计成本（GPT-3.5）：$0.23
# 预计耗时：约 5 分钟
```

### 成本优化策略

- **缓存复用**：相同文案只翻译一次
- **分批处理**：先翻译高优先级文案（如错误提示）
- **本地模型兜底**：简单文案用本地模型，复杂文案用商业 API

### 配置示例

```javascript
module.exports = {
  costControl: {
    // 成本预估
    estimation: {
      enabled: true,
      showBeforeTranslation: true
    },
    
    // 成本上限
    budget: {
      maxCostPerRun: 10, // 单次运行最多 $10
      maxCostPerMonth: 100, // 每月最多 $100
      alertThreshold: 0.8 // 达到 80% 时告警
    },
    
    // 优先级策略
    priority: {
      high: ['error.*', 'warning.*'], // 高优先级
      medium: ['form.*', 'button.*'],
      low: ['tooltip.*', 'placeholder.*']
    },
    
    // 混合翻译策略
    hybrid: {
      // 简单文案（<10 字）用本地模型
      simpleTextThreshold: 10,
      simpleTextModel: 'local',
      // 复杂文案用商业 API
      complexTextModel: 'gpt-4'
    }
  }
}
```

## 9. 可观测性和调试

### 日志系统

详细记录工具运行过程：

```bash
# 运行日志示例
[2026-04-27 10:30:15] INFO  开始扫描文件...
[2026-04-27 10:30:18] INFO  扫描完成，发现 1,234 个文件
[2026-04-27 10:30:18] INFO  提取到 567 条待翻译文案
[2026-04-27 10:30:20] INFO  开始翻译（目标语言：en-US）
[2026-04-27 10:30:25] INFO  翻译完成（缓存命中率：72%）
[2026-04-27 10:30:25] INFO  开始修改代码...
[2026-04-27 10:30:30] INFO  修改完成，共修改 234 个文件
[2026-04-27 10:30:30] INFO  运行 ESLint 检查...
[2026-04-27 10:30:35] INFO  检查通过
```

### 进度条

实时显示处理进度：

```bash
扫描文件: [████████████████████] 100% (1234/1234)
翻译文案: [████████░░░░░░░░░░░░] 45% (256/567)
修改代码: [██░░░░░░░░░░░░░░░░░░] 10% (23/234)
```

### 错误信息优化

清晰的错误提示 + 解决方案链接：

```bash
❌ 错误：无法解析文件 src/views/Dashboard.vue

原因：文件包含语法错误
位置：第 45 行，第 12 列
详情：Unexpected token '}'

建议：
1. 检查第 45 行附近的代码语法
2. 运行 ESLint 修复：npm run lint-fix
3. 查看文档：https://docs.i18n-tool.com/errors/parse-error

如需帮助，请访问：https://github.com/xxx/i18n-tool/issues
```

### 配置示例

```javascript
module.exports = {
  observability: {
    // 日志配置
    logging: {
      level: 'info', // debug | info | warn | error
      output: 'console', // console | file | both
      file: './logs/i18n-tool.log',
      format: 'pretty', // pretty | json
      timestamp: true
    },
    
    // 进度条
    progress: {
      enabled: true,
      style: 'bar', // bar | spinner | dots
      showPercentage: true,
      showETA: true // 显示预计剩余时间
    },
    
    // 错误报告
    errorReporting: {
      verbose: true,
      showStackTrace: false, // 生产环境关闭
      suggestSolutions: true,
      docsBaseUrl: 'https://docs.i18n-tool.com'
    }
  }
}
```

## 10. 文档和培训

### 自动生成文档

工具运行后自动生成：

- **使用规范**：如何在项目中使用 `t()` 函数
- **翻译索引**：所有翻译 key 的清单和说明
- **覆盖率报告**：哪些文件已完成国际化，哪些还未处理

### 交互式教程

提供引导式学习：

```bash
# 启动交互式教程
i18n-tool tutorial

# 教程内容
# 1. 基础概念（5 分钟）
# 2. 扫描和提取（10 分钟）
# 3. 翻译和修改（10 分钟）
# 4. 审核和发布（5 分钟）
```

### 团队培训建议

- **快速上手**（30 分钟）：安装、配置、运行第一次扫描
- **日常使用**（1 小时）：增量更新、审核流程、常见问题
- **高级用法**（2 小时）：自定义规则、性能优化、CI/CD 集成

## 实施考量总结

| 考量维度 | 优先级 | 实施难度 | 影响范围 |
|---------|--------|---------|---------|
| 1. 安全性和隐私保护 | 🔴 高 | 中 | 全局 |
| 2. 版本控制和回滚机制 | 🔴 高 | 低 | 全局 |
| 3. 增量更新和持续维护 | 🟡 中 | 中 | 全局 |
| 4. 团队协作和审核流程 | 🔴 高 | 高 | 团队 |
| 5. 性能和规模优化 | 🟡 中 | 高 | 大型项目 |
| 6. 测试和验证策略 | 🔴 高 | 中 | 全局 |
| 7. 边界情况处理 | 🟡 中 | 中 | 特定场景 |
| 8. 成本控制 | 🟢 低 | 低 | 商业 API |
| 9. 可观测性和调试 | 🟡 中 | 低 | 开发体验 |
| 10. 文档和培训 | 🟡 中 | 低 | 团队推广 |

### 建议实施顺序

**第一批（工具 MVP）**

- 版本控制和回滚机制
- 测试和验证策略
- 可观测性和调试

**第二批（团队推广）**

- 文档和培训
- 团队协作和审核流程
- 边界情况处理

**第三批（生产打磨）**

- 安全性和隐私保护
- 性能和规模优化
- 增量更新和持续维护
- 成本控制

---

## 相关文档

- [README.md](./README.md) - 工具概述和快速开始
- [technical-design.md](./technical-design.md) - 技术设计方案
- [special-cases.md](./special-cases.md) - 特殊场景处理指南
