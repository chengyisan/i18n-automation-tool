# Phase 7 开发计划：api-locale-watch 规则补完

## 阶段目标

实现 api-locale-watch 规则，检测 API 拦截器未监听 locale 变化的问题，完善 i18n 自动化检测能力。

## 背景和需求

### 核心问题

后端返回的数据包含语种相关字段（如 displayName、description、name）时，切换语言后不会自动更新，因为数据已被缓存在前端的 ref 变量中。

**触发条件**：
- 后端根据请求头的 `Accept-Language` 返回不同语言的数据
- 前端只在 `onMounted` 时请求一次接口，未监听 locale 变化
- 切换语言后，界面显示的仍是之前语言的数据

**典型场景**：
- 级联选择器的 displayName
- 模板列表的 name/description
- 动态菜单的名称
- 后端返回的枚举值标签

### 问题代码模式

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const menuList = ref([])

onMounted(() => {
  fetchMenuList() // ❌ 只请求一次，切换语言后不更新
})
</script>
```

### 正确代码模式

```vue
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const menuList = ref([])

const fetchMenuList = async () => {
  const res = await api.getMenuList({
    headers: { 'Accept-Language': locale.value }
  })
  menuList.value = res.data
}

onMounted(() => {
  fetchMenuList()
})

// ✅ 监听 locale 变化，重新请求
watch(locale, () => {
  fetchMenuList()
})
</script>
```

## 任务分解

### Phase 7.1: 简化版实现（MVP）

**优先级**：P1（高）

**功能范围**：
- 只检测 `onMounted` / `onBeforeMount` 中的 API 请求
- 只检测明确使用 `locale.value` 或 `i18n.locale` 的请求
- 检查是否存在 `watch(locale, ...)` 监听

**不包含**：
- 拦截器模式检测（axios.interceptors、fetch 封装）
- watchEffect 包裹的动态请求识别
- 跨文件的 API 调用分析

**实现步骤**：
1. 创建 `ApiLocaleChecker` 类（adapter-vue3）
2. 使用 `@vue/compiler-sfc` 解析 SFC 文件
3. 使用 `@babel/parser` + `@babel/traverse` 解析 script AST
4. 检测 `onMounted` 回调中的 API 请求函数调用
5. 检测请求中是否使用 `locale.value` 或 `i18n.locale`
6. 检查是否存在 `watch(locale, ...)` 监听
7. 生成 `ReactiveIssue` 类型的警告

**预估工作量**：2-3 天

### Phase 7.2: 增强版实现（可选）

**优先级**：P2（中）

**功能范围**：
- 检测 axios 拦截器中的 locale 使用
- 检测 fetch 封装中的 locale 使用
- 识别 watchEffect 包裹的动态请求

**预估工作量**：3-5 天

**推迟原因**：复杂度高，需要识别多种拦截器模式，实际收益不确定。

## 验收标准

### Phase 7.1（简化版）
- [ ] 检测 `onMounted` 中使用 `locale.value` 的 API 请求
- [ ] 检测缺少 `watch(locale, ...)` 的情况
- [ ] 生成清晰的警告信息和修复建议
- [ ] 排除已监听的请求（不误报）
- [ ] 测试覆盖率 > 80%
- [ ] 集成到 CLI 的 `check-reactive` 命令

### Phase 7.2（增强版，可选）
- [ ] 检测 axios 拦截器模式
- [ ] 检测 fetch 封装模式
- [ ] 识别 watchEffect 包裹的请求
- [ ] 测试覆盖率 > 80%

## 技术设计

### 数据结构

```typescript
// packages/adapter-vue3/src/types.ts
export interface ApiLocaleIssue extends ReactiveIssue {
  type: 'api-locale-watch'
  functionName: string  // 请求函数名（如 fetchMenuList）
  hookName: string      // 生命周期钩子名（如 onMounted）
}
```

### 核心算法

```typescript
class ApiLocaleChecker {
  check(source: string, filePath: string): ApiLocaleIssue[]
  
  private detectApiCallsInHook(hookCallExpression: CallExpression): ApiCall[]
  private usesLocale(apiCall: ApiCall): boolean
  private hasLocaleWatcher(scriptAst: AST): boolean
}
```

### 检测逻辑流程

```
1. 解析 SFC → 提取 <script setup> 或 <script>
2. 解析 script AST
3. 遍历 CallExpression 节点
4. 识别 onMounted / onBeforeMount 调用
5. 递归检查回调函数体：
   - 查找 API 请求调用（axios/fetch/api.*）
   - 检测是否使用 locale.value 或 i18n.locale
6. 检查同一 script 中是否存在 watch(locale, ...)
7. 若缺少监听，生成 api-locale-watch 警告
```

### 警告信息设计

```typescript
{
  type: 'api-locale-watch',
  severity: 'info',
  message: 'API request in onMounted uses locale but does not watch locale changes',
  suggestion: 'Add watch(locale, () => { fetchMenuList() }) to refetch data on language change',
  filePath: '/path/to/component.vue',
  line: 10,
  code: 'onMounted(() => { fetchMenuList() })',
  functionName: 'fetchMenuList',
  hookName: 'onMounted'
}
```

### 集成方式

**方式 1：独立 checker**
```typescript
// packages/adapter-vue3/src/checker/apiLocaleChecker.ts
export class ApiLocaleChecker {
  check(source: string, filePath: string): ApiLocaleIssue[]
}
```

**方式 2：集成到 ReactiveChecker**
```typescript
// packages/adapter-vue3/src/checker/reactiveChecker.ts
export class ReactiveChecker {
  check(source: string, filePath: string): ReactiveIssue[] {
    const issues = [
      ...this.checkReactiveTCall(ast),
      ...this.checkFactoryFunctionSync(ast),
      ...this.checkApiLocaleWatch(ast),  // 新增
    ]
    return issues
  }
}
```

**推荐**：方式 1（独立 checker），保持单一职责。

## 技术风险

### 高风险
1. **AST 分析复杂度** - 需要递归分析函数调用链，可能遗漏嵌套调用
2. **误报率** - 可能将静态数据请求误报为需要监听 locale

### 中风险
3. **API 请求模式多样** - 不同项目的 API 封装方式不同，难以覆盖所有情况

### 缓解措施
1. 先实现简化版，只检测明确的模式
2. 提供 `// i18n-tool-disable-next-line api-locale-watch` 注释忽略机制
3. 收集实际项目的误报案例，持续优化

## 实现优先级

**Phase 7.1（简化版）**：建议实现
- 覆盖 80% 的常见场景
- 实现难度适中（2-3 天）
- 能够提供实际价值

**Phase 7.2（增强版）**：可选
- 覆盖剩余 20% 的边缘场景
- 实现难度高（3-5 天）
- 投入产出比不高

## 下一步计划

完成 Phase 7.1 后：
1. 在实际项目中验证检测效果
2. 收集误报案例，优化检测逻辑
3. 根据反馈决定是否实现 Phase 7.2
4. 准备 v1.0.0 正式版发布

## 参考资料

- **ReactiveChecker**：`packages/adapter-vue3/src/checker/reactiveChecker.ts`
- **TemplateConcatChecker**：`packages/adapter-vue3/src/checker/templateConcatChecker.ts`
- **经验教训**：`docs/lessons-learned.md` 规则 #12
