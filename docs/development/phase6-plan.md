# Phase 6 开发计划：fix 和 translate CLI 命令

## 阶段目标

实现 CLI 的 fix 和 translate 命令，补全"扫描→修复→翻译→验证"完整自动化闭环。

## 历史遗留任务

| 任务 | 来源 | 优先级 |
|------|------|--------|
| fix 命令 CLI 实现 | Phase 4.5/5.1 | P0（高） |
| translate 命令 CLI 实现 | Phase 4.5/5.1 | P1（中） |
| api-locale-watch 规则 | Phase 4.5 | P2（低，推迟） |

## 任务分解

### Task 1: fix 命令 (packages/cli)

**功能**：交互式修复硬编码中文，替换为 t() 调用并更新语言包。

**实现步骤**：
1. 调用 ChineseScanner 扫描硬编码中文
2. 过滤掉不可转换的中文（UntranslatableDetector）
3. 逐个（或按文件分组）展示硬编码，询问用户确认
4. 为每个硬编码生成语义化 i18n key
5. 调用 CodeReplacer 执行替换：
   - 源文件：硬编码 → t('key')
   - 语言包：添加 key-value
   - 自动添加 useI18n() 导入（如果需要）
6. 替换后运行 check-reactive 验证响应式问题

**关键设计**：
- 支持 `--dry-run` 模式：只生成 diff，不实际写入
- 支持 `--auto` 模式：自动批量替换，跳过确认
- 支持 `--file` 参数：只处理指定文件
- Key 命名规范：camelCase，模块分组（如 `userProfile.xxx`）

**依赖模块**：
- ChineseScanner（core）
- UntranslatableDetector（core）
- CodeReplacer（adapter-vue3）
- inquirer（CLI 交互）

**预估工作量**：2-3 天

### Task 2: translate 命令 (packages/cli)

**功能**：批量翻译语言包，调用翻译 API 并更新所有语言的 JSON 文件。

**实现步骤**：
1. 读取基准语言包（config.defaultLocale）
2. 对每个目标语言：
   - 读取现有翻译
   - 找出缺失的 key
   - 调用 ApiTranslator 批量翻译
   - 运行质量检查（ChinglishChecker 等）
   - 写回语言包 JSON
3. 展示翻译结果统计

**关键设计**：
- 翻译 API 支持：Google Translate / DeepL
- API Key 通过环境变量配置（`I18N_TRANSLATE_API_KEY`）
- 支持 `--locale` 参数：只翻译指定语言
- 支持 `--dry-run` 模式：只展示待翻译的 key，不实际调用 API
- 使用 CacheManager 避免重复翻译

**依赖模块**：
- ApiTranslator（core）
- CacheManager（core）
- ChinglishChecker, RedundancyChecker（core，翻译后质量检查）

**预估工作量**：1-2 天

### Task 3: api-locale-watch 规则 (packages/adapter-vue3)

**功能**：检测 API 拦截器未监听 locale 变化（推迟到需求明确后再做）。

**复杂度**：中等，需要识别多种拦截器模式。

**推迟原因**：优先级低于 fix/translate，实际使用中可能不常见。

## 验收标准

### fix 命令
- [ ] `i18n-tool fix <path>` 扫描并交互式替换
- [ ] `--dry-run` 模式只展示 diff
- [ ] `--auto` 模式自动批量替换
- [ ] Key 命名符合规范（camelCase，模块分组）
- [ ] 自动添加 useI18n() 导入
- [ ] 替换后无响应式问题
- [ ] 测试覆盖率 > 80%

### translate 命令
- [ ] `i18n-tool translate` 批量翻译所有语言
- [ ] `i18n-tool translate --locale en-US` 只翻译指定语言
- [ ] `--dry-run` 模式只展示待翻译 key
- [ ] 支持 Google Translate / DeepL API
- [ ] 翻译后自动质量检查
- [ ] 使用缓存避免重复翻译
- [ ] 测试覆盖率 > 80%

## 技术风险

1. **fix 命令的代码替换准确性**：需要处理复杂的 AST 场景（JSX、模板字符串、计算属性等）
2. **翻译 API 限流**：需要实现 rate limiting 和重试机制
3. **翻译质量**：机器翻译可能不准确，需要提示用户人工审核

## 下一步计划

完成 Phase 6 后：
- Phase 7（可选）：api-locale-watch 规则补完
- 实际项目端到端验证
- 发布 v1.0.0 正式版
