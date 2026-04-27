# DuplicateDetector 规格说明

## 功能描述

检测项目中重复出现的中文字符串，识别可以提取为共享翻译的文本，支持 monorepo 中的共享翻译检测。

## 核心职责

1. 扫描多个文件，统计中文字符串的出现次数
2. 识别重复出现的字符串（出现次数 ≥ 阈值）
3. 记录每个重复字符串的所有出现位置
4. 提供合并建议（是否应该提取为共享翻译）

## 输入输出

### 输入
```typescript
interface DetectOptions {
  /** 扫描结果列表 */
  scanResults: ScanResult[]
  /** 最小出现次数阈值（默认 2） */
  minOccurrences?: number
  /** 是否跨文件检测（默认 true） */
  crossFile?: boolean
}
```

### 输出
```typescript
interface DuplicateKey {
  /** 重复的中文文本 */
  key: string
  /** 文本内容 */
  value: string
  /** 出现的位置 */
  locations: Array<{
    filePath: string
    line: number
  }>
  /** 出现次数 */
  count: number
}
```

## 核心算法

### 1. 字符串聚合
```typescript
// 伪代码
function aggregateStrings(scanResults: ScanResult[]): Map<string, Location[]> {
  const stringMap = new Map()
  
  for (const result of scanResults) {
    for (const str of result.strings) {
      if (!stringMap.has(str.text)) {
        stringMap.set(str.text, [])
      }
      stringMap.get(str.text).push({
        filePath: result.filePath,
        line: str.position.line
      })
    }
  }
  
  return stringMap
}
```

### 2. 重复检测
```typescript
// 伪代码
function detectDuplicates(
  stringMap: Map<string, Location[]>,
  minOccurrences: number
): DuplicateKey[] {
  const duplicates: DuplicateKey[] = []
  
  for (const [text, locations] of stringMap) {
    if (locations.length >= minOccurrences) {
      duplicates.push({
        key: generateKey(text),
        value: text,
        locations,
        count: locations.length
      })
    }
  }
  
  return duplicates.sort((a, b) => b.count - a.count)
}
```

### 3. Key 生成策略
```typescript
function generateKey(text: string): string {
  // 1. 去除标点符号
  const cleaned = text.replace(/[，。！？、；：""''（）【】《》]/g, '')
  
  // 2. 转为拼音首字母或使用语义化命名
  // 例如："请选择" -> "pleaseSelect"
  
  // 3. 如果文本过长，使用摘要
  if (cleaned.length > 20) {
    return generateSummaryKey(cleaned)
  }
  
  return toCamelCase(cleaned)
}
```

## 边界情况处理

### 1. 单字符重复
- 忽略单个字符的重复（如"是"、"否"）
- 最小长度阈值：2 个字符

### 2. 相似但不完全相同的字符串
- 不做模糊匹配，只检测完全相同的字符串
- 避免误报

### 3. 跨文件 vs 单文件
- `crossFile: true`：检测整个项目的重复
- `crossFile: false`：只检测单个文件内的重复

### 4. 空字符串和空白字符
- 忽略空字符串
- 忽略只包含空白字符的字符串

## 测试用例

### 测试 1：基本重复检测
```typescript
const scanResults = [
  {
    filePath: 'a.vue',
    strings: [
      { text: '请选择', position: { line: 10, column: 5 } },
      { text: '请选择', position: { line: 20, column: 8 } }
    ]
  }
]

const duplicates = detector.detect(scanResults, { minOccurrences: 2 })

expect(duplicates).toHaveLength(1)
expect(duplicates[0].value).toBe('请选择')
expect(duplicates[0].count).toBe(2)
```

### 测试 2：跨文件检测
```typescript
const scanResults = [
  {
    filePath: 'a.vue',
    strings: [{ text: '保存', position: { line: 10, column: 5 } }]
  },
  {
    filePath: 'b.vue',
    strings: [{ text: '保存', position: { line: 15, column: 3 } }]
  }
]

const duplicates = detector.detect(scanResults, { minOccurrences: 2 })

expect(duplicates[0].locations).toHaveLength(2)
expect(duplicates[0].locations[0].filePath).toBe('a.vue')
expect(duplicates[0].locations[1].filePath).toBe('b.vue')
```

### 测试 3：阈值过滤
```typescript
const scanResults = [
  {
    filePath: 'a.vue',
    strings: [
      { text: '确定', position: { line: 10, column: 5 } },
      { text: '取消', position: { line: 11, column: 5 } },
      { text: '取消', position: { line: 12, column: 5 } },
      { text: '取消', position: { line: 13, column: 5 } }
    ]
  }
]

const duplicates = detector.detect(scanResults, { minOccurrences: 3 })

expect(duplicates).toHaveLength(1)
expect(duplicates[0].value).toBe('取消')
expect(duplicates[0].count).toBe(3)
```

### 测试 4：忽略短字符串
```typescript
const scanResults = [
  {
    filePath: 'a.vue',
    strings: [
      { text: '是', position: { line: 10, column: 5 } },
      { text: '是', position: { line: 11, column: 5 } }
    ]
  }
]

const duplicates = detector.detect(scanResults, { minOccurrences: 2 })

expect(duplicates).toHaveLength(0) // 单字符被忽略
```

### 测试 5：按出现次数排序
```typescript
const scanResults = [
  {
    filePath: 'a.vue',
    strings: [
      { text: '保存', position: { line: 10, column: 5 } },
      { text: '保存', position: { line: 11, column: 5 } },
      { text: '取消', position: { line: 12, column: 5 } },
      { text: '取消', position: { line: 13, column: 5 } },
      { text: '取消', position: { line: 14, column: 5 } }
    ]
  }
]

const duplicates = detector.detect(scanResults)

expect(duplicates[0].value).toBe('取消') // 3 次
expect(duplicates[1].value).toBe('保存') // 2 次
```

## 实现注意事项

1. **性能优化**
   - 使用 Map 而不是数组查找
   - 大文件时考虑流式处理

2. **内存管理**
   - 避免存储完整的文件内容
   - 只存储必要的位置信息

3. **Key 生成**
   - 保持语义化
   - 避免冲突
   - 考虑使用现有的 key 生成逻辑

4. **扩展性**
   - 预留模糊匹配的接口
   - 支持自定义过滤规则

## 与其他模块的关系

- **输入来源**：ChineseScanner 的扫描结果
- **输出使用**：CLI 工具展示重复报告，建议用户提取共享翻译
- **配置依赖**：I18nToolConfig.sharedTranslationDetection

## 使用示例

```typescript
import { ChineseScanner } from './scanner/ChineseScanner'
import { DuplicateDetector } from './scanner/DuplicateDetector'

const scanner = new ChineseScanner(config)
const detector = new DuplicateDetector()

// 扫描多个文件
const scanResults = [
  scanner.scan(file1Content, 'a.vue'),
  scanner.scan(file2Content, 'b.vue'),
  scanner.scan(file3Content, 'c.vue')
]

// 检测重复
const duplicates = detector.detect(scanResults, {
  minOccurrences: 3,
  crossFile: true
})

// 输出报告
console.log(`发现 ${duplicates.length} 个重复的翻译`)
for (const dup of duplicates) {
  console.log(`"${dup.value}" 出现 ${dup.count} 次`)
  console.log('位置：')
  for (const loc of dup.locations) {
    console.log(`  - ${loc.filePath}:${loc.line}`)
  }
}
```
