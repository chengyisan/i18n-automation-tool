# ConfigLoader 规格说明

## 功能描述

配置加载器，负责加载和验证 i18n 工具的配置文件（`.i18nrc.json`），提供默认配置，并合并用户自定义配置。

## 核心职责

1. 从项目根目录加载 `.i18nrc.json` 配置文件
2. 提供合理的默认配置
3. 合并用户配置和默认配置（用户配置优先）
4. 验证配置的有效性
5. 支持配置缓存，避免重复读取

## 输入输出

### 输入
- `configPath?: string` - 配置文件路径（可选，默认为当前目录的 `.i18nrc.json`）
- `options?: { validate?: boolean }` - 加载选项

### 输出
- `I18nToolConfig` - 完整的配置对象

## 默认配置

```typescript
const DEFAULT_CONFIG: I18nToolConfig = {
  locales: ['zh-CN', 'en-US'],
  defaultLocale: 'zh-CN',
  langDir: 'locales',
  sharedI18nPackage: undefined,
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/coverage/**',
  ],
  keyPrefix: '',
  translationService: 'local',

  qualityChecks: {
    chinglish: true,
    redundantExpressions: true,
    rtlConcatenation: true,
  },

  reactiveChecks: {
    staticObjectWithT: true,
    refAssignmentWithT: true,
  },

  layoutChecks: {
    fixedWidth: true,
    tableColumnWidth: true,
  },

  untranslatablePatterns: {
    backendValues: ['value', 'code', 'status', 'type'],
    imageExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.gif'],
    svgTextNodes: true,
  },

  sharedTranslationDetection: {
    enabled: true,
    minOccurrences: 3,
    suggestMerge: true,
  },

  security: {
    translationMode: 'local',
    sensitivePatterns: [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
    ],
    requireApproval: true,
  },

  performance: {
    parallelScan: { enabled: true, maxWorkers: 4 },
    translationCache: { 
      enabled: true, 
      path: '.i18n-cache', 
      ttl: '7d' 
    },
    batchTranslation: { enabled: true, batchSize: 50 },
  },
}
```

## 配置验证规则

### 必填字段
- `locales` - 至少包含一个语言代码
- `defaultLocale` - 必须在 `locales` 中
- `langDir` - 不能为空

### 格式验证
- `locales` - 必须是字符串数组
- `exclude` - 必须是 glob 模式数组
- `translationService` - 必须是 `'google' | 'deepl' | 'claude' | 'local'`

### 逻辑验证
- `defaultLocale` 必须存在于 `locales` 中
- `performance.parallelScan.maxWorkers` 必须 > 0
- `sharedTranslationDetection.minOccurrences` 必须 >= 2

## 核心方法

### `loadConfig(configPath?: string): I18nToolConfig`

加载配置文件并返回合并后的配置对象。

**流程**：
1. 确定配置文件路径（默认为 `./.i18nrc.json`）
2. 检查文件是否存在
3. 读取并解析 JSON 文件
4. 深度合并用户配置和默认配置
5. 验证配置有效性
6. 返回最终配置

**错误处理**：
- 文件不存在 → 使用默认配置
- JSON 解析失败 → 抛出错误
- 验证失败 → 抛出详细错误信息

### `validateConfig(config: Partial<I18nToolConfig>): ValidationResult`

验证配置对象的有效性。

**返回**：
```typescript
{
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

### `mergeConfig(userConfig: Partial<I18nToolConfig>, defaultConfig: I18nToolConfig): I18nToolConfig`

深度合并用户配置和默认配置。

**规则**：
- 对象类型：递归合并
- 数组类型：用户配置完全覆盖
- 基本类型：用户配置优先

## 使用示例

```typescript
import { ConfigLoader } from '@i18n-tool/core'

// 加载默认路径的配置
const config = ConfigLoader.loadConfig()

// 加载指定路径的配置
const config = ConfigLoader.loadConfig('./custom-config.json')

// 仅验证配置
const result = ConfigLoader.validateConfig(userConfig)
if (!result.valid) {
  console.error('配置错误:', result.errors)
}
```

## 测试用例

### 1. 加载默认配置
- 输入：无配置文件
- 输出：返回 DEFAULT_CONFIG

### 2. 加载用户配置
- 输入：有效的 `.i18nrc.json`
- 输出：合并后的配置

### 3. 配置验证 - 成功
- 输入：有效配置
- 输出：`{ valid: true, errors: [], warnings: [] }`

### 4. 配置验证 - 失败
- 输入：`defaultLocale` 不在 `locales` 中
- 输出：`{ valid: false, errors: ['defaultLocale must be in locales'], warnings: [] }`

### 5. 深度合并
- 输入：用户配置部分覆盖
- 输出：正确合并的配置对象

### 6. JSON 解析错误
- 输入：格式错误的 JSON 文件
- 输出：抛出 SyntaxError

## 实现注意事项

1. **配置缓存**：避免重复读取文件，使用单例模式或缓存机制
2. **路径处理**：使用 `path.resolve()` 处理相对路径
3. **深度合并**：注意数组和对象的合并策略
4. **错误信息**：提供清晰的错误提示，包含字段名和期望值
5. **向后兼容**：如果配置格式升级，需要支持旧版本配置的迁移

## 依赖

- `fs` - 文件系统操作
- `path` - 路径处理
- 无外部依赖（保持轻量）
