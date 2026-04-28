# CLI 工具规格文档

## 功能描述

`@i18n-tool/cli` 是 i18n 自动化工具链的命令行入口，将 core 和 adapter-vue3 的能力封装为可直接使用的终端命令。

## 命令列表

### scan — 扫描硬编码中文

**输入**: 项目路径
**输出**: 硬编码中文列表、不可转换中文列表、重复翻译列表

**调用的上游模块**:
- `ChineseScanner.scanContent()` — 扫描硬编码中文
- `UntranslatableDetector.detect()` — 检测不可转换中文
- `DuplicateDetector.detect()` — 检测重复翻译

**选项**:
- `--json` — JSON 格式输出
- `--include-comments` — 包含注释中的中文

### validate — 验证配置和语言包

**输入**: 项目路径
**输出**: 配置验证结果、语言包 key 完整性报告

**调用的上游模块**:
- `ConfigValidator.validate()` — 验证配置
- `checkKeyIntegrity()` — 检查语言包 key 完整性

### report — 生成覆盖率报告

**输入**: 项目路径
**输出**: i18n 覆盖率报告 + key 完整性统计

**调用的上游模块**:
- `CoverageReporter.generate()` — 生成覆盖率报告
- `checkKeyIntegrity()` — key 完整性统计

**选项**:
- `--json` — JSON 格式输出
- `--format markdown` — Markdown 格式输出

### check-reactive — 响应式问题检查

**输入**: 项目路径（Vue 文件）
**输出**: 响应式问题列表

**调用的上游模块**:
- `ReactiveChecker.check()` — 检测 t() 响应式问题
- `TemplateConcatChecker.check()` — 检测模板拼接空格问题

### check-quality — 翻译质量检查

**输入**: 语言包文件路径
**输出**: 质量问题列表

**调用的上游模块**:
- `ChinglishChecker.check()` — 中式英语检测
- `RedundancyChecker.check()` — 冗余表达检测
- `RtlChecker.check()` — RTL 拼接问题检测

**选项**:
- `--locale <code>` — 指定检查的语言
- `--checks <list>` — 指定检查项（chinglish,redundant,rtl）

### check-layout — CSS 布局检查

**输入**: 项目路径
**输出**: 布局问题列表

**调用的上游模块**:
- `LayoutChecker.check()` — 检测固定宽度/高度

### init — 初始化配置

**输入**: 交互式问答
**输出**: `.i18nrc.json` 配置文件

## 公共工具模块

### loadConfig
- 读取 `.i18nrc.json` 或 `--config` 指定的文件
- 使用 `ConfigLoader.mergeConfig()` 合并默认配置

### logger
- `info(msg)` — 蓝色信息
- `warn(msg)` — 黄色警告
- `error(msg)` — 红色错误
- `success(msg)` — 绿色成功

### spinner
- `start(msg)` — 开始 spinner
- `succeed(msg)` — 成功结束
- `fail(msg)` — 失败结束

### formatters
- `formatScanResult(result, json)` — 格式化扫描结果
- `formatValidationResult(result, json)` — 格式化验证结果
- `formatCoverageReport(report, json)` — 格式化覆盖率报告

## 退出码

- `0` — 成功，无问题
- `1` — 发现 error 级别问题
- `2` — 配置错误或运行时错误

## 测试策略

- 每个命令编写集成测试
- 使用临时目录和 fixture 文件
- 验证输出格式（文本和 JSON）
- 验证退出码
