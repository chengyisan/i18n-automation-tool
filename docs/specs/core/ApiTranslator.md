# ApiTranslator 规格说明

## 功能描述

翻译 API 集成器，支持多种翻译服务（Google / DeepL / Claude / Local），提供统一的翻译接口，集成缓存管理，支持批量翻译和插值变量保留。

## 核心职责

1. 集成多种翻译服务
2. 提供统一的翻译接口
3. 集成 CacheManager，优先使用缓存
4. 保留插值变量格式（如 `{name}`, `{count}`）
5. 支持批量翻译，减少 API 调用
6. 错误处理和重试机制
7. 支持本地模式（开发阶段，直接返回原文）

## 输入输出

### 输入

```typescript
interface TranslatorOptions {
  /** 翻译服务类型 */
  service: 'google' | 'deepl' | 'claude' | 'local'
  /** API 密钥（local 模式不需要） */
  apiKey?: string
  /** 缓存管理器 */
  cacheManager?: CacheManager
  /** 批量翻译大小 */
  batchSize?: number  // 默认 50
  /** 重试次数 */
  maxRetries?: number  // 默认 3
}

interface TranslateRequest {
  text: string
  from: string  // BCP 47 格式，如 'zh-CN'
  to: string    // BCP 47 格式，如 'en-US'
}
```

### 输出

```typescript
interface TranslateResult {
  originalText: string
  translatedText: string
  from: string
  to: string
  service: string
  cached: boolean
}
```

## 核心方法

### `translate(request: TranslateRequest): Promise<TranslateResult>`

翻译单个文本。

**流程**:
1. 检查缓存，如果命中直接返回
2. 提取插值变量（如 `{name}`），替换为占位符
3. 调用翻译服务 API
4. 恢复插值变量
5. 写入缓存
6. 返回结果

**插值变量处理**:
```typescript
// 原文: "欢迎 {name} 登录"
// 提取: ["欢迎 __PLACEHOLDER_0__ 登录", ["{name}"]]
// 翻译: "Welcome __PLACEHOLDER_0__ to login"
// 恢复: "Welcome {name} to login"
```

### `translateBatch(requests: TranslateRequest[]): Promise<TranslateResult[]>`

批量翻译文本。

**流程**:
1. 批量查询缓存
2. 将未命中的文本分组（按 from-to 语言对）
3. 分批调用翻译 API（每批 batchSize 个）
4. 批量写入缓存
5. 合并缓存和 API 结果
6. 返回结果数组

**优化**:
- 相同语言对的文本合并为一次 API 调用
- 使用 Promise.all 并行处理不同语言对
- 批量操作减少网络开销

### `extractPlaceholders(text: string): [string, string[]]`

提取插值变量。

**支持的格式**:
- `{name}` - 花括号格式
- `{{name}}` - 双花括号格式
- `%s`, `%d` - printf 格式
- `$1`, `$2` - 位置参数

**实现**:
```typescript
function extractPlaceholders(text: string): [string, string[]] {
  const placeholders: string[] = []
  let index = 0
  
  const processed = text.replace(/\{[^}]+\}/g, (match) => {
    placeholders.push(match)
    return `__PLACEHOLDER_${index++}__`
  })
  
  return [processed, placeholders]
}
```

### `restorePlaceholders(text: string, placeholders: string[]): string`

恢复插值变量。

**实现**:
```typescript
function restorePlaceholders(text: string, placeholders: string[]): string {
  let result = text
  placeholders.forEach((placeholder, index) => {
    result = result.replace(`__PLACEHOLDER_${index}__`, placeholder)
  })
  return result
}
```

## 翻译服务适配器

### LocalTranslator

本地模式，直接返回原文（开发阶段使用）。

```typescript
class LocalTranslator implements TranslationService {
  async translate(text: string, from: string, to: string): Promise<string> {
    return text  // 直接返回原文
  }
  
  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    return texts  // 直接返回原文数组
  }
}
```

### GoogleTranslator

Google Cloud Translation API 适配器。

```typescript
class GoogleTranslator implements TranslationService {
  private client: Translate
  
  constructor(apiKey: string) {
    this.client = new Translate({ key: apiKey })
  }
  
  async translate(text: string, from: string, to: string): Promise<string> {
    const [translation] = await this.client.translate(text, {
      from,
      to,
      format: 'text'
    })
    return translation
  }
  
  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    const [translations] = await this.client.translate(texts, { from, to })
    return translations
  }
}
```

### DeepLTranslator

DeepL API 适配器。

```typescript
class DeepLTranslator implements TranslationService {
  private apiKey: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async translate(text: string, from: string, to: string): Promise<string> {
    const response = await fetch('https://api.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: [text],
        source_lang: from.split('-')[0].toUpperCase(),
        target_lang: to.split('-')[0].toUpperCase()
      })
    })
    
    const data = await response.json()
    return data.translations[0].text
  }
  
  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    // 类似实现
  }
}
```

### ClaudeTranslator

Claude API 适配器（使用 Anthropic API）。

```typescript
class ClaudeTranslator implements TranslationService {
  private apiKey: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async translate(text: string, from: string, to: string): Promise<string> {
    const prompt = `Translate the following text from ${from} to ${to}. Only return the translation, no explanations:\n\n${text}`
    
    // 调用 Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    
    const data = await response.json()
    return data.content[0].text.trim()
  }
  
  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    // 批量翻译：将多个文本合并为一个 prompt
    const prompt = `Translate the following texts from ${from} to ${to}. Return only the translations, one per line:\n\n${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
    
    const response = await this.callClaude(prompt)
    return response.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim())
  }
}
```

## 错误处理和重试

```typescript
async function translateWithRetry(
  fn: () => Promise<string>,
  maxRetries: number
): Promise<string> {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // 如果是 API 限流，等待后重试
      if (error.code === 'RATE_LIMIT') {
        await sleep(1000 * (i + 1))  // 指数退避
        continue
      }
      
      // 其他错误直接抛出
      throw error
    }
  }
  
  throw lastError
}
```

## 使用示例

```typescript
import { ApiTranslator, CacheManager } from '@i18n-tool/core'

// 初始化缓存
const cache = new CacheManager({
  cachePath: '.i18n-cache/translations.db',
  ttl: '7d'
})

// 初始化翻译器（本地模式）
const translator = new ApiTranslator({
  service: 'local',
  cacheManager: cache
})

// 翻译单个文本
const result = await translator.translate({
  text: '欢迎 {name} 登录',
  from: 'zh-CN',
  to: 'en-US'
})

console.log(result.translatedText)  // "Welcome {name} to login"
console.log(result.cached)  // false（首次翻译）

// 批量翻译
const results = await translator.translateBatch([
  { text: '你好', from: 'zh-CN', to: 'en-US' },
  { text: '世界', from: 'zh-CN', to: 'en-US' },
  { text: '你好', from: 'zh-CN', to: 'es-ES' }
])

// 使用 Google 翻译
const googleTranslator = new ApiTranslator({
  service: 'google',
  apiKey: process.env.GOOGLE_API_KEY,
  cacheManager: cache,
  batchSize: 50,
  maxRetries: 3
})
```

## 测试用例

### 1. 本地模式翻译
- 输入：任意文本
- 输出：返回原文

### 2. 插值变量保留
- 输入：`"欢迎 {name} 登录"`
- 输出：`"Welcome {name} to login"`（{name} 保留）

### 3. 缓存命中
- 输入：已缓存的文本
- 输出：从缓存返回，`cached: true`

### 4. 缓存未命中
- 输入：未缓存的文本
- 输出：调用 API 翻译，`cached: false`

### 5. 批量翻译
- 输入：多个文本
- 输出：全部翻译成功

### 6. 批量翻译 - 部分缓存
- 输入：部分已缓存，部分未缓存
- 输出：缓存的直接返回，未缓存的调用 API

### 7. API 错误重试
- 输入：模拟 API 失败
- 输出：重试后成功或抛出错误

### 8. 多种插值格式
- 输入：`{name}`, `{{name}}`, `%s`, `$1`
- 输出：所有格式都正确保留

### 9. 空文本
- 输入：空字符串
- 输出：返回空字符串

### 10. 特殊字符
- 输入：包含换行符、引号等特殊字符
- 输出：正确处理

## 性能优化

1. **缓存优先**: 优先使用缓存，减少 API 调用
2. **批量翻译**: 合并多个文本为一次 API 调用
3. **并行处理**: 不同语言对并行翻译
4. **连接复用**: 复用 HTTP 连接
5. **限流控制**: 避免超过 API 限制

## 实现注意事项

1. **API 密钥安全**: 不要硬编码 API 密钥，使用环境变量
2. **错误处理**: API 调用可能失败，需要捕获异常
3. **限流**: 遵守 API 的速率限制
4. **插值变量**: 确保翻译后变量格式不变
5. **语言代码转换**: 不同 API 使用不同的语言代码格式
6. **批量大小**: 根据 API 限制调整 batchSize
7. **超时处理**: 设置合理的超时时间

## 依赖

- `@google-cloud/translate` - Google 翻译（可选）
- `deepl-node` - DeepL 翻译（可选）
- `@anthropic-ai/sdk` - Claude API（可选）
- `CacheManager` - 缓存管理器
