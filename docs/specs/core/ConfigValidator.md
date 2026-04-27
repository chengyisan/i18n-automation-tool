# ConfigValidator 规格说明

## 功能描述

i18n 配置验证器，检查项目的 i18n 配置完整性、语言包文件存在性、key 的一致性等。

## 核心职责

1. 验证 i18n 配置文件是否存在
2. 验证语言包文件是否存在
3. 检查所有语言的 key 是否一致
4. 检查是否有缺失的翻译
5. 检查是否有未使用的 key
6. 生成验证报告

## 输入输出

### 输入

```typescript
interface ValidateOptions {
  /** 项目根目录 */
  projectRoot: string
  /** i18n 配置 */
  config: I18nToolConfig
  /** 是否检查未使用的 key */
  checkUnused?: boolean
}
```

### 输出

```typescript
interface ValidationResult {
  /** 是否通过验证 */
  passed: boolean
  /** 错误列表 */
  errors: ValidationError[]
  /** 警告列表 */
  warnings: ValidationWarning[]
  /** 覆盖率统计 */
  coverage: CoverageStats
}

interface ValidationError {
  filePath: string
  line?: number
  message: string
  rule: string
}

interface ValidationWarning {
  filePath: string
  line?: number
  message: string
  rule: string
}

interface CoverageStats {
  /** 总文案数 */
  total: number
  /** 已翻译数 */
  translated: number
  /** 覆盖率百分比 */
  percentage: number
  /** 各语种覆盖率 */
  byLocale: Record<string, { translated: number; total: number; percentage: number }>
}
```

## 核心方法

### `validate(options: ValidateOptions): ValidationResult`

执行完整的配置验证。

**流程**:
1. 检查配置文件
2. 检查语言包文件
3. 检查 key 一致性
4. 检查缺失翻译
5. 检查未使用的 key（可选）
6. 生成报告

### `checkConfigFile(projectRoot: string): ValidationError[]`

检查 i18n 配置文件是否存在。

**检查项**:
- `.i18nrc.json` 是否存在
- 配置文件格式是否正确
- 必填字段是否完整

**示例错误**:
```typescript
{
  filePath: '.i18nrc.json',
  message: 'i18n config file not found',
  rule: 'config-file-exists'
}
```

### `checkLanguageFiles(projectRoot: string, config: I18nToolConfig): ValidationError[]`

检查语言包文件是否存在。

**检查项**:
- 每个 locale 的语言包目录是否存在
- 语言包文件格式是否正确（JSON）
- 文件是否可读

**示例错误**:
```typescript
{
  filePath: 'locales/en-US/common.json',
  message: 'Language file not found',
  rule: 'language-file-exists'
}
```

### `checkKeyConsistency(languageFiles: Map<string, any>): ValidationError[]`

检查所有语言的 key 是否一致。

**检查逻辑**:
1. 提取所有语言的 key 集合
2. 找出基准语言（通常是 defaultLocale）的所有 key
3. 检查其他语言是否有缺失或多余的 key

**示例错误**:
```typescript
{
  filePath: 'locales/en-US/common.json',
  message: 'Missing key: "common.submit" (exists in zh-CN)',
  rule: 'key-consistency'
}

{
  filePath: 'locales/es-ES/common.json',
  message: 'Extra key: "common.obsolete" (not in zh-CN)',
  rule: 'key-consistency'
}
```

### `checkMissingTranslations(languageFiles: Map<string, any>): ValidationWarning[]`

检查缺失的翻译（key 存在但值为空）。

**检查逻辑**:
```typescript
function checkMissingTranslations(translations: any, locale: string, prefix = ''): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  
  for (const [key, value] of Object.entries(translations)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    
    if (typeof value === 'object' && value !== null) {
      // 递归检查嵌套对象
      warnings.push(...checkMissingTranslations(value, locale, fullKey))
    } else if (!value || value === '') {
      warnings.push({
        filePath: `locales/${locale}/common.json`,
        message: `Missing translation for key: "${fullKey}"`,
        rule: 'missing-translation'
      })
    }
  }
  
  return warnings
}
```

**示例警告**:
```typescript
{
  filePath: 'locales/en-US/common.json',
  message: 'Missing translation for key: "common.newFeature"',
  rule: 'missing-translation'
}
```

### `checkUnusedKeys(projectRoot: string, languageFiles: Map<string, any>): ValidationWarning[]`

检查未使用的翻译 key。

**检查逻辑**:
1. 提取所有语言包中的 key
2. 扫描项目代码，查找 `t('key')` 或 `$t('key')` 的调用
3. 找出未被引用的 key

**实现**:
```typescript
async function checkUnusedKeys(projectRoot: string, allKeys: Set<string>): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = []
  const usedKeys = new Set<string>()
  
  // 扫描所有代码文件
  const files = await glob('**/*.{vue,js,ts,jsx,tsx}', {
    cwd: projectRoot,
    ignore: ['node_modules/**', 'dist/**']
  })
  
  for (const file of files) {
    const content = await fs.readFile(path.join(projectRoot, file), 'utf-8')
    
    // 匹配 t('key') 或 $t('key')
    const matches = content.matchAll(/\$?t\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g)
    
    for (const match of matches) {
      usedKeys.add(match[1])
    }
  }
  
  // 找出未使用的 key
  for (const key of allKeys) {
    if (!usedKeys.has(key)) {
      warnings.push({
        filePath: 'locales',
        message: `Unused translation key: "${key}"`,
        rule: 'unused-key'
      })
    }
  }
  
  return warnings
}
```

**示例警告**:
```typescript
{
  filePath: 'locales',
  message: 'Unused translation key: "common.obsoleteFeature"',
  rule: 'unused-key'
}
```

### `calculateCoverage(languageFiles: Map<string, any>): CoverageStats`

计算翻译覆盖率。

**计算逻辑**:
```typescript
function calculateCoverage(languageFiles: Map<string, any>): CoverageStats {
  const byLocale: Record<string, any> = {}
  let totalKeys = 0
  
  // 计算每个语言的覆盖率
  for (const [locale, translations] of languageFiles) {
    const { total, translated } = countTranslations(translations)
    
    byLocale[locale] = {
      total,
      translated,
      percentage: total > 0 ? (translated / total) * 100 : 0
    }
    
    totalKeys = Math.max(totalKeys, total)
  }
  
  // 计算总体覆盖率
  const totalTranslated = Object.values(byLocale).reduce((sum, stats) => sum + stats.translated, 0)
  const totalPossible = totalKeys * languageFiles.size
  
  return {
    total: totalKeys,
    translated: Math.floor(totalTranslated / languageFiles.size),
    percentage: totalPossible > 0 ? (totalTranslated / totalPossible) * 100 : 0,
    byLocale
  }
}

function countTranslations(obj: any): { total: number; translated: number } {
  let total = 0
  let translated = 0
  
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const nested = countTranslations(value)
      total += nested.total
      translated += nested.translated
    } else {
      total++
      if (value && value !== '') {
        translated++
      }
    }
  }
  
  return { total, translated }
}
```

## 使用示例

```typescript
import { ConfigValidator } from '@i18n-tool/core'

const validator = new ConfigValidator()

const result = validator.validate({
  projectRoot: '/path/to/project',
  config: loadedConfig,
  checkUnused: true
})

if (!result.passed) {
  console.error('Validation failed:')
  result.errors.forEach(error => {
    console.error(`  ${error.filePath}: ${error.message}`)
  })
}

if (result.warnings.length > 0) {
  console.warn('Warnings:')
  result.warnings.forEach(warning => {
    console.warn(`  ${warning.filePath}: ${warning.message}`)
  })
}

console.log(`Coverage: ${result.coverage.percentage.toFixed(2)}%`)
console.log('By locale:')
for (const [locale, stats] of Object.entries(result.coverage.byLocale)) {
  console.log(`  ${locale}: ${stats.percentage.toFixed(2)}% (${stats.translated}/${stats.total})`)
}
```

## 测试用例

### 1. 配置文件不存在
- 输入：项目没有 `.i18nrc.json`
- 输出：错误 "config-file-exists"

### 2. 语言包文件缺失
- 输入：配置了 `en-US` 但文件不存在
- 输出：错误 "language-file-exists"

### 3. Key 不一致
- 输入：`zh-CN` 有 key，`en-US` 没有
- 输出：错误 "key-consistency"

### 4. 缺失翻译
- 输入：key 存在但值为空
- 输出：警告 "missing-translation"

### 5. 未使用的 key
- 输入：语言包有 key，但代码中未使用
- 输出：警告 "unused-key"

### 6. 覆盖率计算
- 输入：多个语言包
- 输出：正确的覆盖率统计

### 7. 嵌套对象
- 输入：多层嵌套的翻译对象
- 输出：正确检查所有层级

### 8. 完全通过
- 输入：配置完整、无错误
- 输出：`passed: true`, 无错误和警告

## 实现注意事项

1. **性能**: 扫描未使用 key 可能很慢，应该是可选的
2. **嵌套对象**: 递归处理多层嵌套的翻译
3. **路径处理**: 使用 `path.resolve()` 处理相对路径
4. **错误恢复**: 某个文件读取失败不应该中断整个验证
5. **并发**: 可以并行读取多个语言包文件
6. **缓存**: 对于大项目，可以缓存扫描结果

## 依赖

- `fs/promises` - 文件系统操作
- `path` - 路径处理
- `glob` - 文件匹配（用于扫描未使用 key）
