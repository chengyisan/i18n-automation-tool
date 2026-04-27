# Phase 2 开发计划

**开发阶段**: Phase 2 - Core 包翻译、质量检查、验证模块  
**计划时间**: 2026-04-27  
**预计工作量**: 2-3 天

---

## 📋 目标

完成 core 包剩余的核心模块：
1. **翻译模块** - ApiTranslator + CacheManager
2. **质量检查模块** - ChinglishChecker + RedundancyChecker + RtlChecker
3. **验证模块** - ConfigValidator + CoverageReporter + LayoutChecker

---

## 🎯 优先级排序

### 高优先级（必须完成）
1. **CacheManager** - 翻译缓存管理（避免重复调用 API）
2. **ApiTranslator** - 翻译 API 集成（支持本地模式）
3. **ConfigValidator** - 配置验证器
4. **CoverageReporter** - 覆盖率报告

### 中优先级（重要但可延后）
5. **ChinglishChecker** - 中式英语检测
6. **RedundancyChecker** - 冗余表达检测
7. **LayoutChecker** - 布局适配检查

### 低优先级（可选）
8. **RtlChecker** - RTL 布局检查（阿语特定）

---

## 📝 实施步骤

### Step 1: 翻译模块（2-3 小时）

**1.1 CacheManager**
- 使用 better-sqlite3 实现翻译缓存
- 支持 TTL（Time To Live）
- 支持批量查询和写入
- 缓存 key 格式：`${sourceText}_${sourceLang}_${targetLang}`

**1.2 ApiTranslator**
- 支持多种翻译服务（Google / DeepL / Claude / Local）
- 本地模式：直接返回原文（开发阶段）
- 保留插值变量格式 `{name}`, `{count}` 等
- 批量翻译优化（减少 API 调用）
- 集成 CacheManager

**规格文档**:
- `docs/specs/core/CacheManager.md`
- `docs/specs/core/ApiTranslator.md`

### Step 2: 质量检查模块（2-3 小时）

**2.1 ChinglishChecker**
- 检测常见的中式英语模式
- 基于规则的检测（正则 + 词典）
- 提供修正建议

**2.2 RedundancyChecker**
- 检测冗余表达（如 "please kindly"）
- 检测重复词汇
- 提供简化建议

**2.3 RtlChecker**
- 检测 RTL 语言的拼接问题
- 检测方向性标点符号
- 提供 RTL 适配建议

**规格文档**:
- `docs/specs/core/QualityCheckers.md`（三个 checker 合并）

### Step 3: 验证模块（2-3 小时）

**3.1 ConfigValidator**
- 验证 i18n 配置完整性
- 检查语言包文件是否存在
- 检查 key 的一致性

**3.2 CoverageReporter**
- 统计翻译覆盖率
- 按语言生成报告
- 识别缺失的翻译

**3.3 LayoutChecker**
- 检测 CSS 固定宽度
- 检测表格列宽配置
- 提供响应式改造建议

**规格文档**:
- `docs/specs/core/ConfigValidator.md`
- `docs/specs/core/CoverageReporter.md`
- `docs/specs/core/LayoutChecker.md`

### Step 4: 测试（1-2 小时）

为每个模块编写单元测试：
- `CacheManager.test.ts`
- `ApiTranslator.test.ts`
- `QualityCheckers.test.ts`
- `ConfigValidator.test.ts`
- `CoverageReporter.test.ts`
- `LayoutChecker.test.ts`

---

## 🔧 技术细节

### 翻译缓存数据库结构

```sql
CREATE TABLE translation_cache (
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

CREATE INDEX idx_cache_lookup ON translation_cache(source_text, source_lang, target_lang);
CREATE INDEX idx_cache_expiry ON translation_cache(expires_at);
```

### 翻译 API 接口设计

```typescript
interface TranslationService {
  translate(text: string, from: string, to: string): Promise<string>
  translateBatch(texts: string[], from: string, to: string): Promise<string[]>
}
```

### 质量检查规则示例

```typescript
// 中式英语规则
const chinglishPatterns = [
  { pattern: /very\s+like/i, suggestion: 'Use "really like" or "love"' },
  { pattern: /open\s+the\s+light/i, suggestion: 'Use "turn on the light"' },
  // ...
]

// 冗余表达规则
const redundancyPatterns = [
  { pattern: /please\s+kindly/i, suggestion: 'Use "please" or "kindly", not both' },
  { pattern: /advance\s+planning/i, suggestion: 'Use "planning" (planning is always in advance)' },
  // ...
]
```

---

## ✅ 验收标准

- [ ] 所有模块实现完成
- [ ] 单元测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 类型定义完整
- [ ] 代码注释清晰
- [ ] 规格文档完善
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告

---

## 📊 预期成果

### 代码量估算
- CacheManager: ~150 行
- ApiTranslator: ~200 行
- ChinglishChecker: ~150 行
- RedundancyChecker: ~100 行
- RtlChecker: ~100 行
- ConfigValidator: ~200 行
- CoverageReporter: ~150 行
- LayoutChecker: ~150 行
- 测试代码: ~800 行

**总计**: ~2,000 行

### 测试用例估算
- 翻译模块: 15 个测试
- 质量检查: 20 个测试
- 验证模块: 20 个测试

**总计**: ~55 个测试

---

## 🚀 下一步

Phase 2 完成后，将进入 Phase 3：
- 实现 adapter-vue3 包（Vue SFC 解析和代码替换）
- 或者先实现 MCP Server（提供基础的扫描和翻译功能）

---

## 📚 参考资源

- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3)
- [Google Cloud Translation API](https://cloud.google.com/translate/docs)
- [DeepL API](https://www.deepl.com/docs-api)
- 参考项目的翻译优化记录：
  - `i18n-english-review.md`
  - `i18n-spanish-review.md`
  - `i18n-arabic-review.md`
