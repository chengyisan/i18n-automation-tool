# QualityCheckers 规格说明

## 功能描述

翻译质量检查器集合，包含三个检查器：
1. **ChinglishChecker** - 中式英语检测
2. **RedundancyChecker** - 冗余表达检测  
3. **RtlChecker** - RTL 语言拼接问题检测

## 1. ChinglishChecker - 中式英语检测器

### 功能描述

检测英文翻译中的中式英语（Chinglish）模式，提供修正建议。

### 核心职责

1. 检测常见的中式英语表达
2. 基于规则的模式匹配
3. 提供地道的英文替代建议
4. 支持自定义规则

### 检测规则

```typescript
interface ChinglishRule {
  pattern: RegExp
  description: string
  suggestion: string
  severity: 'error' | 'warning' | 'info'
}

const CHINGLISH_RULES: ChinglishRule[] = [
  {
    pattern: /very\s+like/i,
    description: '"very like" is Chinglish',
    suggestion: 'Use "really like" or "love"',
    severity: 'warning'
  },
  {
    pattern: /open\s+the\s+light/i,
    description: '"open the light" is Chinglish',
    suggestion: 'Use "turn on the light"',
    severity: 'warning'
  },
  {
    pattern: /close\s+the\s+light/i,
    description: '"close the light" is Chinglish',
    suggestion: 'Use "turn off the light"',
    severity: 'warning'
  },
  {
    pattern: /eat\s+medicine/i,
    description: '"eat medicine" is Chinglish',
    suggestion: 'Use "take medicine"',
    severity: 'warning'
  },
  {
    pattern: /give\s+you/i,
    description: 'Overuse of "give you"',
    suggestion: 'Consider more specific verbs like "provide", "offer", "send"',
    severity: 'info'
  },
  {
    pattern: /how\s+to\s+say/i,
    description: '"how to say" is Chinglish',
    suggestion: 'Use "how do you say" or "what do you call"',
    severity: 'warning'
  },
  {
    pattern: /people\s+mountain\s+people\s+sea/i,
    description: 'Direct translation from Chinese idiom',
    suggestion: 'Use "crowded" or "packed with people"',
    severity: 'error'
  },
  {
    pattern: /long\s+time\s+no\s+see/i,
    description: 'Chinglish greeting (though sometimes accepted)',
    suggestion: 'Use "It\'s been a while" or "Haven\'t seen you in a long time"',
    severity: 'info'
  }
]
```

### 使用示例

```typescript
const checker = new ChinglishChecker()

const issues = checker.check('I very like this product', 'en-US')
// [
//   {
//     text: 'very like',
//     pattern: /very\s+like/i,
//     description: '"very like" is Chinglish',
//     suggestion: 'Use "really like" or "love"',
//     severity: 'warning',
//     position: { start: 2, end: 11 }
//   }
// ]
```

---

## 2. RedundancyChecker - 冗余表达检测器

### 功能描述

检测翻译中的冗余表达，提供简化建议。

### 核心职责

1. 检测重复词汇
2. 检测冗余修饰语
3. 检测同义词堆砌
4. 提供简化建议

### 检测规则

```typescript
interface RedundancyRule {
  pattern: RegExp
  description: string
  suggestion: string
  severity: 'error' | 'warning' | 'info'
}

const REDUNDANCY_RULES: RedundancyRule[] = [
  {
    pattern: /please\s+kindly/i,
    description: 'Redundant: "please" and "kindly" mean the same',
    suggestion: 'Use "please" or "kindly", not both',
    severity: 'warning'
  },
  {
    pattern: /advance\s+planning/i,
    description: 'Redundant: planning is always in advance',
    suggestion: 'Use "planning"',
    severity: 'info'
  },
  {
    pattern: /past\s+history/i,
    description: 'Redundant: history is always in the past',
    suggestion: 'Use "history"',
    severity: 'info'
  },
  {
    pattern: /future\s+plans/i,
    description: 'Redundant: plans are always for the future',
    suggestion: 'Use "plans"',
    severity: 'info'
  },
  {
    pattern: /end\s+result/i,
    description: 'Redundant: result is always at the end',
    suggestion: 'Use "result"',
    severity: 'info'
  },
  {
    pattern: /free\s+gift/i,
    description: 'Redundant: gifts are always free',
    suggestion: 'Use "gift"',
    severity: 'info'
  },
  {
    pattern: /completely\s+finished/i,
    description: 'Redundant: finished means completely done',
    suggestion: 'Use "finished"',
    severity: 'info'
  },
  {
    pattern: /absolutely\s+essential/i,
    description: 'Redundant: essential means absolutely necessary',
    suggestion: 'Use "essential"',
    severity: 'info'
  },
  {
    pattern: /very\s+unique/i,
    description: 'Redundant: unique means one of a kind',
    suggestion: 'Use "unique"',
    severity: 'warning'
  }
]
```

### 使用示例

```typescript
const checker = new RedundancyChecker()

const issues = checker.check('Please kindly submit your form', 'en-US')
// [
//   {
//     text: 'please kindly',
//     pattern: /please\s+kindly/i,
//     description: 'Redundant: "please" and "kindly" mean the same',
//     suggestion: 'Use "please" or "kindly", not both',
//     severity: 'warning',
//     position: { start: 0, end: 13 }
//   }
// ]
```

---

## 3. RtlChecker - RTL 语言检测器

### 功能描述

检测 RTL（Right-to-Left）语言（如阿拉伯语、希伯来语）的拼接问题和方向性标点符号使用。

### 核心职责

1. 检测字符串拼接问题
2. 检测方向性标点符号
3. 检测混合方向文本
4. 提供 RTL 适配建议

### 检测规则

```typescript
interface RtlIssue {
  type: 'concatenation' | 'punctuation' | 'mixed-direction'
  description: string
  suggestion: string
  severity: 'error' | 'warning' | 'info'
  position?: { start: number; end: number }
}

// RTL 语言列表
const RTL_LANGUAGES = ['ar', 'ar-SA', 'he', 'he-IL', 'fa', 'fa-IR', 'ur', 'ur-PK']

// 方向性标点符号
const DIRECTIONAL_PUNCTUATION = {
  '(': ')',  // 在 RTL 中应该反向
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{'
}
```

### 检测场景

#### 1. 字符串拼接问题

```typescript
// ❌ 错误：直接拼接会导致方向混乱
const msg = 'مرحبا' + name + 'في النظام'

// ✅ 正确：使用插值语法
const msg = t('welcome', { name })  // 翻译文件：'مرحبا {name} في النظام'
```

**检测逻辑**:
```typescript
function detectConcatenation(text: string, locale: string): RtlIssue[] {
  if (!isRtlLanguage(locale)) return []
  
  const issues: RtlIssue[] = []
  
  // 检测是否包含插值变量
  const hasInterpolation = /\{[^}]+\}/.test(text)
  
  // 检测是否有 LTR 字符（如英文、数字）
  const hasLtrChars = /[a-zA-Z0-9]/.test(text)
  
  if (hasInterpolation && hasLtrChars) {
    issues.push({
      type: 'concatenation',
      description: 'RTL text with interpolation may have direction issues',
      suggestion: 'Ensure proper RTL handling for interpolated values',
      severity: 'warning'
    })
  }
  
  return issues
}
```

#### 2. 方向性标点符号

```typescript
// ❌ 错误：括号方向不对
const text = 'النص (التفاصيل)'

// ✅ 正确：RTL 环境下括号应该反向
const text = 'النص )التفاصيل('
```

**检测逻辑**:
```typescript
function detectPunctuation(text: string, locale: string): RtlIssue[] {
  if (!isRtlLanguage(locale)) return []
  
  const issues: RtlIssue[] = []
  
  // 检测括号等方向性标点
  const matches = text.matchAll(/[()[\]{}]/g)
  
  for (const match of matches) {
    issues.push({
      type: 'punctuation',
      description: `Directional punctuation "${match[0]}" may need adjustment in RTL`,
      suggestion: 'Verify punctuation direction in RTL context',
      severity: 'info',
      position: { start: match.index, end: match.index + 1 }
    })
  }
  
  return issues
}
```

#### 3. 混合方向文本

```typescript
// 检测 RTL 文本中混合 LTR 内容（如英文单词、数字）
function detectMixedDirection(text: string, locale: string): RtlIssue[] {
  if (!isRtlLanguage(locale)) return []
  
  const issues: RtlIssue[] = []
  
  // 检测是否同时包含 RTL 和 LTR 字符
  const hasRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
  const hasLtr = /[a-zA-Z]/.test(text)
  
  if (hasRtl && hasLtr) {
    issues.push({
      type: 'mixed-direction',
      description: 'Mixed RTL and LTR text detected',
      suggestion: 'Use Unicode bidirectional control characters (LRM, RLM) if needed',
      severity: 'info'
    })
  }
  
  return issues
}
```

### 使用示例

```typescript
const checker = new RtlChecker()

const issues = checker.check('مرحبا {name} في النظام', 'ar-SA')
// [
//   {
//     type: 'concatenation',
//     description: 'RTL text with interpolation may have direction issues',
//     suggestion: 'Ensure proper RTL handling for interpolated values',
//     severity: 'warning'
//   }
// ]
```

---

## 统一接口

所有检查器实现相同的接口：

```typescript
interface QualityChecker {
  check(text: string, locale: string): QualityIssue[]
}

interface QualityIssue {
  type: string
  text?: string
  pattern?: RegExp
  description: string
  suggestion: string
  severity: 'error' | 'warning' | 'info'
  position?: { start: number; end: number }
}
```

## 使用示例（组合使用）

```typescript
import { ChinglishChecker, RedundancyChecker, RtlChecker } from '@i18n-tool/core'

const checkers = [
  new ChinglishChecker(),
  new RedundancyChecker(),
  new RtlChecker()
]

function checkQuality(text: string, locale: string): QualityIssue[] {
  const allIssues: QualityIssue[] = []
  
  for (const checker of checkers) {
    const issues = checker.check(text, locale)
    allIssues.push(...issues)
  }
  
  return allIssues
}

// 检查英文翻译
const enIssues = checkQuality('I very like this product', 'en-US')

// 检查阿拉伯语翻译
const arIssues = checkQuality('مرحبا {name} في النظام', 'ar-SA')
```

## 测试用例

### ChinglishChecker
1. 检测 "very like" → 建议 "really like"
2. 检测 "open the light" → 建议 "turn on the light"
3. 无问题的文本 → 返回空数组

### RedundancyChecker
1. 检测 "please kindly" → 建议只用一个
2. 检测 "advance planning" → 建议 "planning"
3. 无冗余的文本 → 返回空数组

### RtlChecker
1. RTL 语言 + 插值 → 警告拼接问题
2. RTL 语言 + 括号 → 提示检查方向
3. 非 RTL 语言 → 返回空数组
4. 混合方向文本 → 提示使用控制字符

## 实现注意事项

1. **规则可扩展**: 支持用户自定义规则
2. **性能**: 使用正则预编译，避免重复编译
3. **国际化**: 规则描述支持多语言
4. **严重级别**: 区分 error / warning / info
5. **位置信息**: 提供问题在文本中的位置
6. **语言特定**: 某些检查器只对特定语言生效

## 依赖

- 无外部依赖（纯正则 + 字符串处理）
