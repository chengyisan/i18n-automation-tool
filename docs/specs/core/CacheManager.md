# CacheManager 规格说明

## 功能描述

翻译缓存管理器，使用 SQLite 数据库存储翻译结果，避免重复调用翻译 API，提高性能并降低成本。

## 核心职责

1. 初始化 SQLite 数据库和表结构
2. 查询缓存的翻译结果
3. 写入新的翻译结果到缓存
4. 支持批量查询和写入
5. 自动清理过期缓存
6. 支持配置 TTL（Time To Live）

## 数据库设计

### 表结构

```sql
CREATE TABLE IF NOT EXISTS translation_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_text TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  service TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(source_text, source_lang, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_cache_lookup 
  ON translation_cache(source_text, source_lang, target_lang);

CREATE INDEX IF NOT EXISTS idx_cache_expiry 
  ON translation_cache(expires_at);
```

### 字段说明

- `id` - 自增主键
- `source_text` - 原文
- `source_lang` - 源语言（BCP 47 格式，如 `zh-CN`）
- `target_lang` - 目标语言（BCP 47 格式，如 `en-US`）
- `translated_text` - 翻译结果
- `service` - 翻译服务（`google` / `deepl` / `claude` / `local`）
- `created_at` - 创建时间（Unix 时间戳，毫秒）
- `expires_at` - 过期时间（Unix 时间戳，毫秒）

### 唯一约束

`(source_text, source_lang, target_lang)` 组合唯一，避免重复缓存。

## 输入输出

### 输入

```typescript
interface CacheManagerOptions {
  /** 缓存文件路径 */
  cachePath: string
  /** TTL（Time To Live），默认 7 天 */
  ttl?: string  // 格式：'7d', '24h', '30m'
}

interface CacheKey {
  sourceText: string
  sourceLang: string
  targetLang: string
}

interface CacheEntry extends CacheKey {
  translatedText: string
  service: string
}
```

### 输出

```typescript
interface CachedTranslation {
  translatedText: string
  service: string
  createdAt: number
  expiresAt: number
}
```

## 核心方法

### `constructor(options: CacheManagerOptions)`

初始化缓存管理器。

**流程**:
1. 解析 TTL 字符串为毫秒数
2. 确保缓存目录存在
3. 连接或创建 SQLite 数据库
4. 创建表和索引
5. 启动定期清理任务（每小时清理一次过期缓存）

### `get(key: CacheKey): CachedTranslation | null`

查询单个翻译缓存。

**流程**:
1. 构建查询 SQL
2. 查询数据库
3. 检查是否过期
4. 返回结果或 null

**SQL**:
```sql
SELECT translated_text, service, created_at, expires_at
FROM translation_cache
WHERE source_text = ? 
  AND source_lang = ? 
  AND target_lang = ?
  AND expires_at > ?
LIMIT 1
```

### `getBatch(keys: CacheKey[]): Map<string, CachedTranslation>`

批量查询翻译缓存。

**流程**:
1. 构建批量查询 SQL（使用 IN 子句）
2. 查询数据库
3. 过滤过期结果
4. 返回 Map（key 为 `${sourceText}_${sourceLang}_${targetLang}`）

**优化**: 使用事务和批量查询，减少数据库 I/O

### `set(entry: CacheEntry): void`

写入单个翻译缓存。

**流程**:
1. 计算过期时间 `expiresAt = now + ttl`
2. 使用 `INSERT OR REPLACE` 写入数据库
3. 如果失败，记录错误日志

**SQL**:
```sql
INSERT OR REPLACE INTO translation_cache 
  (source_text, source_lang, target_lang, translated_text, service, created_at, expires_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

### `setBatch(entries: CacheEntry[]): void`

批量写入翻译缓存。

**流程**:
1. 开启事务
2. 批量插入数据
3. 提交事务
4. 如果失败，回滚并记录错误

**优化**: 使用事务批量写入，性能提升 10-100 倍

### `cleanup(): number`

清理过期缓存。

**流程**:
1. 删除 `expires_at < now` 的记录
2. 执行 `VACUUM` 压缩数据库
3. 返回删除的记录数

**SQL**:
```sql
DELETE FROM translation_cache WHERE expires_at < ?
```

**调用时机**:
- 初始化时执行一次
- 定时任务每小时执行一次
- 手动调用 `cleanup()` 方法

### `close(): void`

关闭数据库连接。

**流程**:
1. 停止定期清理任务
2. 关闭 SQLite 连接
3. 释放资源

## TTL 解析

支持的 TTL 格式：
- `7d` - 7 天
- `24h` - 24 小时
- `30m` - 30 分钟
- `3600s` - 3600 秒

**解析函数**:
```typescript
function parseTTL(ttl: string): number {
  const match = ttl.match(/^(\d+)([dhms])$/)
  if (!match) throw new Error(`Invalid TTL format: ${ttl}`)
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 }
  return value * multipliers[unit]
}
```

## 使用示例

```typescript
import { CacheManager } from '@i18n-tool/core'

// 初始化
const cache = new CacheManager({
  cachePath: '.i18n-cache/translations.db',
  ttl: '7d'
})

// 查询单个
const cached = cache.get({
  sourceText: '你好',
  sourceLang: 'zh-CN',
  targetLang: 'en-US'
})

if (cached) {
  console.log(cached.translatedText) // "Hello"
}

// 批量查询
const keys = [
  { sourceText: '你好', sourceLang: 'zh-CN', targetLang: 'en-US' },
  { sourceText: '世界', sourceLang: 'zh-CN', targetLang: 'en-US' }
]
const results = cache.getBatch(keys)

// 写入单个
cache.set({
  sourceText: '你好',
  sourceLang: 'zh-CN',
  targetLang: 'en-US',
  translatedText: 'Hello',
  service: 'google'
})

// 批量写入
cache.setBatch([
  { sourceText: '你好', sourceLang: 'zh-CN', targetLang: 'en-US', translatedText: 'Hello', service: 'google' },
  { sourceText: '世界', sourceLang: 'zh-CN', targetLang: 'en-US', translatedText: 'World', service: 'google' }
])

// 清理过期缓存
const deleted = cache.cleanup()
console.log(`Deleted ${deleted} expired entries`)

// 关闭
cache.close()
```

## 测试用例

### 1. 初始化
- 输入：有效的配置
- 输出：数据库文件创建，表和索引创建成功

### 2. TTL 解析
- 输入：`'7d'`, `'24h'`, `'30m'`, `'3600s'`
- 输出：正确的毫秒数

### 3. 查询缓存 - 命中
- 输入：存在的 key
- 输出：返回缓存的翻译

### 4. 查询缓存 - 未命中
- 输入：不存在的 key
- 输出：返回 null

### 5. 查询缓存 - 已过期
- 输入：过期的 key
- 输出：返回 null

### 6. 写入缓存
- 输入：有效的翻译条目
- 输出：成功写入数据库

### 7. 批量查询
- 输入：多个 key
- 输出：返回 Map，包含所有命中的结果

### 8. 批量写入
- 输入：多个翻译条目
- 输出：全部成功写入

### 9. 清理过期缓存
- 输入：数据库中有过期和未过期的记录
- 输出：只删除过期记录，返回删除数量

### 10. 重复写入
- 输入：相同 key 的不同翻译
- 输出：后写入的覆盖先写入的

## 性能优化

1. **索引优化**: 为查询字段创建复合索引
2. **批量操作**: 使用事务批量写入，减少 I/O
3. **连接池**: 复用数据库连接
4. **定期清理**: 避免数据库膨胀
5. **VACUUM**: 定期压缩数据库文件

## 实现注意事项

1. **线程安全**: better-sqlite3 不支持多线程，需要在主线程使用
2. **错误处理**: 数据库操作可能失败，需要捕获异常
3. **路径处理**: 确保缓存目录存在，使用 `path.resolve()` 处理路径
4. **资源释放**: 程序退出前调用 `close()` 关闭连接
5. **TTL 默认值**: 如果未指定，默认 7 天
6. **时间戳精度**: 使用毫秒级时间戳，避免精度问题

## 依赖

- `better-sqlite3` - SQLite 数据库
- `fs` - 文件系统操作
- `path` - 路径处理
