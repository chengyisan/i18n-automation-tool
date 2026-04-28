# Phase 4 开发总结：CLI 工具包开发

## 完成时间
2026-04-28

## 阶段目标
将 core 包和 adapter-vue3 包的能力封装为命令行工具，提供独立可用的 CLI 入口，让用户可以直接在终端使用扫描、验证、质量检查等功能。

## 完成的任务清单

### 1. 扩展 core 验证能力 ✅

#### KeyIntegrityChecker 模块
- **文件**: `packages/core/src/validator/KeyIntegrityChecker.ts` (133 行)
- **功能**: 检查多语言包之间的 key 完整性
  - 以基准语言为准，检测其他语言缺失/多余的 key
  - 递归提取嵌套对象的 key 路径（如 `common.button.submit`）
  - 使用 Set 差集运算生成缺失/多余 key 列表
  - 提供结构化的 `KeyIntegrityResult` 输出
- **测试**: 7 个测试用例，覆盖缺失 key、多余 key、嵌套对象、多语言、完全匹配、文件不存在等场景

#### 类型扩展
- **文件**: `packages/core/src/types.ts`
- **新增类型**:
  - `ValidationIssue` 新增 `missing_translation_key` 和 `extra_translation_key` 类型
  - `ValidationIssue` 新增可选字段 `locale?` 和 `key?`
  - `KeyIntegrityResult` 接口（包含 baseLocale、locales、totalKeys、issues、localeStats）
- **完善 I18nToolConfig**:
  - 新增 `translation?: TranslationConfig` — 翻译 API 配置
  - 新增 `cache?: CacheConfig` — 缓存配置
  - 新增 `scan?: { include?: string[]; exclude?: string[] }` — 扫描配置
  - 新增 `localeDir?: string` — langDir 的别名，兼容不同配置风格

### 2. 搭建 CLI 基础骨架 ✅

#### 配置文件
- `packages/cli/tsconfig.json` — 继承根 tsconfig，outDir: dist, rootDir: src
- `packages/cli/vitest.config.ts` — 测试配置，include: `src/__tests__/**/*.test.ts`
- `packages/cli/package.json` — 配置 bin 入口 `i18n-tool`，依赖 commander、inquirer、chalk、ora、glob

#### CLI 入口
- **文件**: `packages/cli/src/cli.ts` (71 行)
- **功能**: 使用 commander 定义 7 个命令和全局选项
  - 全局选项: `-c, --config <path>` 配置文件路径
  - 命令: scan、validate、report、check-reactive、check-quality、check-layout、init
  - 每个命令支持 `--json` 输出格式

#### 工具模块
- `loadConfig.ts` (25 行) — 读取配置文件并合并默认值
- `logger.ts` (17 行) — 封装 chalk 输出 info/warn/error/success
- `spinner.ts` (19 行) — 封装 ora spinner
- `fileDiscovery.ts` (24 行) — 根据 include/exclude 收集目标文件

### 3. 实现 7 个 CLI 命令 ✅

#### scan 命令
- **文件**: `packages/cli/src/commands/scan.ts` (109 行)
- **功能**: 扫描硬编码中文、不可转换中文、重复翻译
- **调用**: ChineseScanner、UntranslatableDetector、DuplicateDetector
- **输出**: 文本格式或 JSON 格式
- **退出码**: 0 (无问题) / 1 (有问题) / 2 (执行失败)

#### validate 命令
- **文件**: `packages/cli/src/commands/validate.ts` (96 行)
- **功能**: 验证 i18n 配置 + 语言包 key 完整性
- **调用**: ConfigValidator、checkKeyIntegrity
- **输出**: 配置问题列表 + key 完整性统计
- **退出码**: 0 (无错误) / 1 (有错误) / 2 (执行失败)

#### report 命令
- **文件**: `packages/cli/src/commands/report.ts` (82 行)
- **功能**: 生成覆盖率报告 + key 完整性统计
- **调用**: CoverageReporter、checkKeyIntegrity
- **输出**: 覆盖率百分比 + 各语言 key 统计

#### check-reactive 命令
- **文件**: `packages/cli/src/commands/checkReactive.ts` (88 行)
- **功能**: 检查 Vue 响应式问题（ref(t())、静态对象中的 t()、模板拼接）
- **调用**: ReactiveChecker、TemplateConcatChecker
- **输出**: 响应式问题列表

#### check-quality 命令
- **文件**: `packages/cli/src/commands/checkQuality.ts` (115 行)
- **功能**: 翻译质量检查（中式英语、冗余表达、RTL 拼接）
- **调用**: ChinglishChecker、RedundancyChecker、RtlChecker
- **输出**: 质量问题列表

#### check-layout 命令
- **文件**: `packages/cli/src/commands/checkLayout.ts` (68 行)
- **功能**: CSS 多语言适配检查（固定宽度、固定高度）
- **调用**: LayoutChecker
- **输出**: 布局问题列表

#### init 命令
- **文件**: `packages/cli/src/commands/init.ts` (95 行)
- **功能**: 交互式生成 `.i18nrc.json` 配置文件
- **调用**: inquirer 交互式问答
- **输出**: 生成配置文件到当前目录

### 4. 编写 CLI 测试 ✅

#### 测试文件清单
- `loadConfig.test.ts` (62 行) — 4 个测试
  - 默认配置、合并配置、自定义路径、无效 JSON
- `logger.test.ts` (30 行) — 4 个测试
  - info/warn/error/success 输出
- `fileDiscovery.test.ts` (68 行) — 5 个测试
  - 文件发现、排除 node_modules、自定义 include、去重、空结果
- `scanCommand.test.ts` (62 行) — 3 个测试
  - 扫描中文、无问题退出码 0、有问题退出码 1
- `validateCommand.test.ts` (73 行) — 2 个测试
  - 验证 key 完整性、完全匹配退出码 0
- `checkQualityCommand.test.ts` (60 行) — 2 个测试
  - 质量检查、无问题退出码 0

#### 测试策略
- Mock `process.exit` 避免测试进程退出
- Mock `spinner` 避免终端输出干扰
- Mock `console.log/error` 验证输出调用
- 使用临时目录创建测试文件，测试后清理
- 动态导入命令模块确保 mock 生效

### 5. 修复构建和类型问题 ✅

#### 类型问题修复
1. **ScanResult 类型重复定义** — 删除第二个定义（lines 307-316），统一使用第一个定义（hardcodedStrings/untranslatables/duplicates）
2. **DuplicateDetector 字段名错误** — `result.strings` → `result.hardcodedStrings`，`str.position.line` → `str.line`
3. **CoverageReporter 方法调用错误** — `scanner.scan()` → `scanner.scanContent()`，`scanResult.strings` → `scanResult.hardcodedStrings`
4. **ConfigValidator 字段访问** — `config.localeDir` → `config.localeDir || config.langDir`
5. **CacheManager 循环引用** — `(items: typeof items)` → `(entries: typeof items)`
6. **ApiTranslator 类型断言** — `response.json()` 返回 `unknown`，需要 `const data: any = await response.json()`

#### 依赖问题修复
1. **缺少 @types/node** — 添加到 core、adapter-vue3、cli 的 devDependencies
2. **缺少 @types/better-sqlite3** — 添加到 core 的 devDependencies
3. **缺少 glob** — 添加到 core 和 cli 的 dependencies
4. **根 tsconfig 缺少 types** — 添加 `"types": ["node"]`

#### ESM 导入问题修复
1. **CoverageReporter 缺少 .js 扩展** — `from '../types'` → `from '../types.js'`，`from '../scanner/ChineseScanner'` → `from '../scanner/ChineseScanner.js'`

#### CLI 代码问题修复
1. **scan.ts 变量作用域** — `totalHardcoded` 和 `totalUntranslatable` 在 else 块内定义但在外部使用，移到 if/else 之前

#### 测试问题修复
1. **DuplicateDetector 测试数据格式** — 所有测试数据从 `strings` 字段改为 `hardcodedStrings`，从 `position: { line, column }` 改为直接 `line, column`
2. **stale 编译产物** — 清理 `src/__tests__/*.js` 文件，避免 vitest 重复运行测试

## 测试结果和覆盖率

### core 包
- **测试文件**: 7 个
- **测试用例**: 94 个
- **通过率**: 100%
- **新增测试**: KeyIntegrityChecker.test.ts (7 个用例)

### adapter-vue3 包
- **测试文件**: 10 个
- **测试用例**: 84 个
- **通过率**: 100%

### cli 包
- **测试文件**: 6 个
- **测试用例**: 20 个
- **通过率**: 100%
- **覆盖模块**: loadConfig、logger、fileDiscovery、scanCommand、validateCommand、checkQualityCommand

## 文件结构和代码量统计

### 新增文件（core）
- `packages/core/src/validator/KeyIntegrityChecker.ts` (133 行)
- `packages/core/src/__tests__/KeyIntegrityChecker.test.ts` (200 行)

### 新增文件（cli）
- **源码**: 15 个文件，823 行
  - cli.ts (71 行)
  - commands/ (7 个命令，共 573 行)
  - utils/ (4 个工具，共 85 行)
- **测试**: 6 个文件，425 行
- **配置**: tsconfig.json、vitest.config.ts、package.json

### 修改文件（core）
- `packages/core/src/types.ts` — 扩展 I18nToolConfig、ValidationIssue，新增 KeyIntegrityResult
- `packages/core/src/index.ts` — 导出 checkKeyIntegrity 和 KeyIntegrityResult
- `packages/core/src/validator/CoverageReporter.ts` — 修复方法调用和字段名
- `packages/core/src/validator/ConfigValidator.ts` — 修复 localeDir 访问
- `packages/core/src/scanner/DuplicateDetector.ts` — 修复字段名
- `packages/core/src/cache/CacheManager.ts` — 修复循环引用
- `packages/core/src/translator/ApiTranslator.ts` — 添加类型断言

### 文档文件
- `docs/development/phase4-plan.md` — 开发计划
- `docs/specs/cli/cli-commands.md` — CLI 规格文档
- `docs/development/phase4-summary.md` — 本文档

## 设计亮点和技术细节

### 1. KeyIntegrityChecker 设计
- **纯函数设计**: 不使用 class，直接导出 `checkKeyIntegrity()` 函数
- **递归 key 提取**: 使用 `extractKeys()` 递归遍历嵌套对象，生成扁平化的 key 路径
- **Set 差集运算**: 使用 Set 数据结构高效计算缺失/多余 key
- **结构化输出**: 返回 `KeyIntegrityResult` 包含统计信息和问题列表

### 2. CLI 命令设计
- **统一退出码**: 0 (成功) / 1 (有问题) / 2 (执行失败)
- **双输出格式**: 文本格式（人类可读）+ JSON 格式（机器可读）
- **Spinner 反馈**: 使用 ora 提供实时进度反馈
- **配置优先级**: 命令行 > 配置文件 > 默认值

### 3. 测试设计
- **Mock 策略**: Mock process.exit、spinner、console 避免副作用
- **临时目录**: 每个测试使用独立临时目录，测试后清理
- **动态导入**: 使用 `await import()` 确保 mock 在导入前生效
- **绝对路径**: 避免使用 `process.chdir()`（vitest worker 不支持）

### 4. 类型安全
- **严格类型检查**: 所有公开 API 都有完整的类型注解
- **类型扩展**: 通过可选字段扩展现有类型，保持向后兼容
- **ESM 规范**: 所有 import 使用 `.js` 扩展，符合 ESM 标准

## 经验教训

### 1. 类型定义冲突
**问题**: `ScanResult` 有两个定义，导致 `DuplicateDetector` 和 `ChineseScanner` 使用不同的格式。

**解决**: 删除重复定义，统一使用第一个定义，更新所有使用方。

**教训**: 在添加新类型前，先搜索是否已有同名类型。

### 2. ESM 导入扩展
**问题**: 部分文件缺少 `.js` 扩展，导致运行时 ESM 解析失败。

**解决**: 为所有相对导入添加 `.js` 扩展。

**教训**: TypeScript 编译通过不代表 ESM 运行时正确，需要严格遵守 ESM 规范。

### 3. vitest worker 限制
**问题**: `process.chdir()` 在 vitest worker 中不支持。

**解决**: 使用绝对路径代替 chdir。

**教训**: 测试代码应避免修改全局状态（如 cwd），使用参数传递路径。

### 4. 测试文件污染
**问题**: 编译产物 `.js` 文件残留在 `src/__tests__/` 导致测试重复运行。

**解决**: 清理 stale 编译产物，确保 tsconfig exclude 正确配置。

**教训**: 定期清理构建产物，避免 dist 和 src 混淆。

### 5. 类型断言 vs any
**问题**: `response.json()` 返回 `unknown`，strict mode 下无法直接访问属性。

**解决**: 使用 `const data: any = await response.json()` 类型断言。

**教训**: 对于外部 API 响应，使用 `any` 类型断言是合理的，但应在调用方做好错误处理。

## 验收标准

### 功能验收
- [x] CLI 可以独立运行，`i18n-tool --help` 输出正确
- [x] 7 个命令都能正常执行
- [x] `--json` 输出格式正确
- [x] 退出码符合规范（0/1/2）
- [x] KeyIntegrityChecker 正确检测缺失/多余 key

### 测试验收
- [x] core 包 94 个测试全部通过
- [x] adapter-vue3 包 84 个测试全部通过
- [x] cli 包 20 个测试全部通过
- [x] 无 TypeScript 编译错误
- [x] 无 ESM 运行时错误

### 文档验收
- [x] phase4-plan.md 完整记录开发计划
- [x] cli-commands.md 完整记录 CLI 规格
- [x] phase4-summary.md 完整记录开发总结

## 未完成的任务

### 来自 Phase 4 计划
以下任务推迟到后续阶段：

1. **fix 命令** — 自动修复硬编码中文
   - 需要文件写回、确认交互、回滚策略
   - 复杂度较高，需要单独规划

2. **translate 命令** — 批量翻译
   - 需要 API Key、批量翻译流程、缓存策略
   - 涉及外部服务，需要单独规划

### 来自 Phase 3.5
以下低优先级规则仍待实现：

1. **locale-code-format** — locale code 格式校验
   - 已有 ConfigValidator 的 BCP 47 校验，需要整合为独立规则
   - 优先级：低

2. **factory-function-sync** — 工厂函数同步问题检测
   - 需要更多实战案例支撑
   - 优先级：低

3. **menu-key-semantic** — 菜单 key 语义化检测
   - 需要定义语义化命名规范
   - 优先级：低

4. **api-locale-watch** — API 请求 locale 监听
   - 需要分析实际项目的 API 拦截器模式
   - 优先级：低

## 下一步计划

### Phase 5 候选方向

1. **MCP Server 开发**
   - 将 CLI 能力封装为 MCP Server
   - 为 Claude Code 提供 i18n 相关工具
   - 支持 Claude Code 直接调用扫描、验证、质量检查

2. **Skill 开发**
   - 将 CLI 能力封装为 Claude Code Skill
   - 提供交互式 i18n 改造体验
   - 支持 `/i18n-scan`、`/i18n-validate` 等快捷命令

3. **fix 和 translate 命令**
   - 实现自动修复硬编码中文
   - 实现批量翻译功能
   - 完善 CLI 工具链

4. **低优先级规则补完**
   - 实现 Phase 3.5 遗留的 4 条规则
   - 根据实际需求调整优先级

## 总结

Phase 4 成功将 core 和 adapter-vue3 的能力封装为独立可用的 CLI 工具，提供了 7 个命令覆盖扫描、验证、质量检查、响应式检查、布局检查、初始化等核心功能。

**关键成果**:
- ✅ 新增 KeyIntegrityChecker 模块，检测语言包 key 完整性
- ✅ 搭建完整的 CLI 基础设施（commander + inquirer + chalk + ora）
- ✅ 实现 7 个可用命令，支持文本和 JSON 双输出格式
- ✅ 编写 20 个 CLI 测试，覆盖核心功能
- ✅ 修复 15+ 类型和构建问题，确保代码质量
- ✅ 完善文档体系（计划 + 规格 + 总结）

**代码质量**:
- 178 个测试全部通过（core 94 + adapter-vue3 84 + cli 20）
- 无 TypeScript 编译错误
- 无 ESM 运行时错误
- 代码覆盖核心功能路径

**交付物**:
- 可独立运行的 CLI 工具（`i18n-tool` 命令）
- 完整的测试套件（20 个测试用例）
- 完善的文档（计划 + 规格 + 总结）

Phase 4 为后续的 MCP Server 和 Skill 开发奠定了坚实基础。
