# Phase 4.5 开发计划：遗留规则补完

## 阶段目标
完成 Phase 3.5 遗留的 4 条低优先级检测规则，补全工具的检测能力覆盖面。

## 背景
Phase 3.5 实战经验总结中识别出 12 条检测规则，其中 8 条已在 Phase 3.5 实现，剩余 4 条因优先级较低推迟到本阶段实现。

## 遗留规则清单

### 1. locale-code-format — locale code 格式校验 ✅ (已有基础)
**优先级**: 低  
**状态**: ConfigValidator 已有 BCP 47 校验，需要整合为独立规则

**现有实现**:
- `packages/core/src/validator/ConfigValidator.ts` 第 79-90 行
- 已验证 BCP 47 格式（`/^[a-z]{2,3}(-[A-Z]{2})?$/`）
- 已生成 `invalid_locale` 类型的 ValidationIssue

**待完成**:
- 无需额外开发，现有实现已满足需求
- 可选：添加更详细的错误提示（如常见错误格式示例）

### 2. factory-function-sync — 工厂函数同步问题检测
**优先级**: 低  
**状态**: 待实现，需要更多实战案例支撑

**问题描述**:
```javascript
// 错误：工厂函数在 setup 外部调用 t()
function createOptions() {
  const { t } = useI18n()
  return [
    { label: t('common.yes'), value: 1 },
    { label: t('common.no'), value: 0 }
  ]
}

// 正确：工厂函数接收 t 作为参数
function createOptions(t) {
  return [
    { label: t('common.yes'), value: 1 },
    { label: t('common.no'), value: 0 }
  ]
}
```

**检测规则**:
- 检测函数定义在 `<script setup>` 外部
- 函数内部调用 `useI18n()` 或使用 `t()`
- 建议：将 `t` 作为参数传入，或使用 computed

**实现位置**: `packages/adapter-vue3/src/checker/reactiveChecker.ts`

**测试用例**:
- 工厂函数在 setup 外部调用 useI18n
- 工厂函数在 setup 外部使用 t()
- 正确的工厂函数（接收 t 作为参数）

### 3. menu-key-semantic — 菜单 key 语义化检测
**优先级**: 低  
**状态**: 待实现，需要定义语义化命名规范

**问题描述**:
```javascript
// 不推荐：使用数字或无意义的 key
const menu = [
  { label: t('menu.1'), path: '/home' },
  { label: t('menu.2'), path: '/about' }
]

// 推荐：使用语义化的 key
const menu = [
  { label: t('menu.home'), path: '/home' },
  { label: t('menu.about'), path: '/about' }
]
```

**检测规则**:
- 检测 `menu.*` 或 `nav.*` 开头的 key
- key 的最后一段是纯数字（如 `menu.1`、`nav.item.2`）
- 建议：使用语义化命名（如 `menu.home`、`nav.item.about`）

**实现位置**: `packages/core/src/quality/` 新增 `MenuKeyChecker.ts`

**测试用例**:
- 检测纯数字 key（menu.1、nav.2）
- 检测嵌套数字 key（menu.item.1）
- 忽略非菜单 key（common.1）
- 正确的语义化 key（menu.home）

### 4. api-locale-watch — API 请求 locale 监听
**优先级**: 低  
**状态**: 待实现，需要分析实际项目的 API 拦截器模式

**问题描述**:
```javascript
// 错误：API 拦截器未监听 locale 变化
axios.interceptors.request.use(config => {
  config.headers['Accept-Language'] = locale.value
  return config
})

// 正确：使用 watchEffect 监听 locale 变化
watchEffect(() => {
  axios.interceptors.request.use(config => {
    config.headers['Accept-Language'] = locale.value
    return config
  })
})
```

**检测规则**:
- 检测 axios/fetch 拦截器配置
- 拦截器中使用了 `locale.value` 或 `i18n.locale`
- 拦截器未包裹在 `watchEffect` 或 `watch` 中
- 建议：使用 watchEffect 监听 locale 变化，或在每次请求时动态获取

**实现位置**: `packages/adapter-vue3/src/checker/` 新增 `ApiLocaleChecker.ts`

**测试用例**:
- 检测 axios 拦截器未监听 locale
- 检测 fetch 拦截器未监听 locale
- 正确的 watchEffect 包裹
- 正确的动态获取 locale

## 实现优先级

### 高优先级（本阶段必须完成）
1. **factory-function-sync** — 工厂函数同步问题
   - 实战中遇到过类似问题
   - 检测逻辑相对清晰
   - 可复用 ReactiveChecker 的 AST 解析能力

2. **menu-key-semantic** — 菜单 key 语义化
   - 规则简单明确
   - 可快速实现
   - 提升代码可维护性

### 中优先级（视时间决定）
3. **api-locale-watch** — API 请求 locale 监听
   - 需要分析更多实战案例
   - 检测逻辑较复杂（需要识别拦截器模式）
   - 可能需要额外的 AST 解析能力

### 低优先级（可选）
4. **locale-code-format** — locale code 格式校验
   - 已有基础实现
   - 仅需文档补充

## 实现步骤

### Step 1: factory-function-sync 实现
1. 扩展 `ReactiveChecker` 或新增 `FactoryFunctionChecker`
2. 检测函数定义位置（setup 内部 vs 外部）
3. 检测函数内部的 `useI18n()` 调用和 `t()` 使用
4. 生成 `factory-function-sync` 类型的 ReactiveIssue
5. 编写 5+ 测试用例

### Step 2: menu-key-semantic 实现
1. 新增 `packages/core/src/quality/MenuKeyChecker.ts`
2. 检测 `menu.*` 或 `nav.*` 开头的 key
3. 使用正则匹配纯数字 key（`/\.\d+$/`）
4. 生成 `menu-key-semantic` 类型的 QualityIssue
5. 编写 5+ 测试用例

### Step 3: api-locale-watch 实现（可选）
1. 新增 `packages/adapter-vue3/src/checker/ApiLocaleChecker.ts`
2. 检测 axios/fetch 拦截器配置
3. 检测拦截器中的 locale 引用
4. 检测是否包裹在 watchEffect/watch 中
5. 生成 `api-locale-watch` 类型的 ReactiveIssue
6. 编写 5+ 测试用例

### Step 4: 文档和测试
1. 更新 `docs/lessons-learned.md` 补充规则说明
2. 更新 `docs/special-cases.md` 补充示例
3. 更新 CLI 命令支持新规则
4. 运行全量测试确保无回归

## 验收标准

### 功能验收
- [ ] factory-function-sync 规则实现并通过测试
- [ ] menu-key-semantic 规则实现并通过测试
- [ ] api-locale-watch 规则实现并通过测试（可选）
- [ ] CLI 命令支持新规则
- [ ] 文档更新完整

### 测试验收
- [ ] 新增测试用例全部通过
- [ ] 现有测试无回归
- [ ] 代码覆盖率不降低

### 文档验收
- [ ] lessons-learned.md 补充规则说明
- [ ] special-cases.md 补充示例
- [ ] phase4.5-summary.md 完整记录开发总结

## 时间估算
- factory-function-sync: 2-3 小时
- menu-key-semantic: 1-2 小时
- api-locale-watch: 3-4 小时（可选）
- 文档和测试: 1-2 小时

**总计**: 4-7 小时（不含 api-locale-watch）

## 风险和依赖
- **风险**: api-locale-watch 规则可能需要更复杂的 AST 解析，实现难度较高
- **依赖**: 无外部依赖，可独立开发
- **缓解**: 如果 api-locale-watch 实现困难，可推迟到 Phase 5

## 下一步
完成 Phase 4.5 后，可选方向：
1. Phase 5: MCP Server 开发
2. Phase 5: Skill 开发
3. Phase 5: fix 和 translate 命令实现
