# 跨框架适配分析

**国际化自动化工具 - 框架差异与扩展性评估**

最后更新：2026-04-27

---

当前工具基于 Vue 3 + vue-i18n 技术栈设计。如果应用到其他框架/技术栈，会面临以下挑战和适配成本。

## 1. 框架层面差异（影响最大）

| 对比维度 | Vue 3 | React | Angular | Svelte |
|---------|-------|-------|---------|--------|
| **模板语法** | Template + SFC | JSX | Template + TypeScript | Template + Script |
| **i18n 库** | vue-i18n | react-i18next | ngx-translate | svelte-i18n |
| **响应式机制** | Proxy (ref/reactive) | useState/useEffect | RxJS/Signals | $: reactive statements |
| **文件格式** | .vue (SFC) | .jsx/.tsx | .component.ts + .html | .svelte |
| **AST 解析器** | @vue/compiler-sfc | @babel/parser | @angular/compiler | svelte/compiler |
| **全局注入** | app.use(i18n) | I18nextProvider | providers array | stores |

**核心问题**：

- AST 解析器完全不同，需要重写所有代码扫描逻辑
- 代码替换模式要重写（模板语法差异巨大）
- 响应式规则不适用（computed/watch vs useEffect vs subscribe）

**适配成本**：每个框架需要 **80-120 小时**

---

## 2. i18n 库层面差异

| 对比维度 | vue-i18n | react-i18next | ngx-translate | svelte-i18n |
|---------|----------|---------------|---------------|-------------|
| **初始化方式** | createI18n() | i18next.init() | TranslateModule.forRoot() | init() from svelte-i18n |
| **语言文件格式** | JSON / YAML | JSON / 嵌套 JSON | JSON | JSON |
| **命名空间** | 不支持（扁平 key） | 原生支持 | 不支持 | 不支持 |
| **插值语法** | `{name}` | `{{name}}` | `{{ name }}` | `{name}` |
| **复数处理** | `@.plural` | 内置 plural rules | 手动处理 | ICU MessageFormat |
| **动态加载** | `loadLocaleMessages()` | `i18next.loadNamespaces()` | `TranslateHttpLoader` | `register()` |

**适配成本**：每个 i18n 库需要 **40-60 小时**

---

## 3. UI 组件库层面差异

| UI 库 | 框架 | 国际化接入方式 | locale 包路径 |
|-------|------|--------------|--------------|
| **Element Plus** | Vue 3 | `ElConfigProvider :locale` | `element-plus/es/locale/lang/*` |
| **Ant Design** | React | `ConfigProvider locale` | `antd/es/locale/*` |
| **MUI** | React | `ThemeProvider` + `LocalizationProvider` | `@mui/material/locale` |
| **Vuetify** | Vue 3 | `createVuetify({ locale })` | `vuetify/lib/locale/*` |
| **PrimeNG** | Angular | `TranslationService` | `primeng/api` |
| **Carbon** | React/Vue/Angular | 各框架独立实现 | `@carbon/locales` |

**适配成本**：每个 UI 库需要 **20-30 小时**

---

## 4. 构建工具层面差异（影响较小）

| 对比维度 | Webpack 5 | Vite | Rollup | Turbopack |
|---------|-----------|------|--------|-----------|
| **动态导入** | `import()` + magic comments | `import()` 原生支持 | `import()` | `import()` |
| **别名解析** | `resolve.alias` | `resolve.alias` | `@rollup/plugin-alias` | `resolveAlias` |
| **环境变量** | `DefinePlugin` / `process.env` | `import.meta.env` | `@rollup/plugin-replace` | `process.env` |
| **配置文件** | `webpack.config.js` | `vite.config.ts` | `rollup.config.js` | `turbopack.config.js` |

**适配成本**：每个构建工具需要 **10-20 小时**

---

## 5. 微前端方案差异

| 对比维度 | Qiankun | Module Federation | micro-app | iframe | 单体应用 |
|---------|---------|-------------------|-----------|--------|---------|
| **语言同步机制** | globalState + props | shared module | data 通信 | postMessage | 不需要 |
| **状态共享方式** | Pinia 跨应用共享 | 共享 store 模块 | 数据通信 API | URL params / storage | 全局 store |

**适配成本**：每个微前端方案需要 **15-25 小时**

---

## 6. 跨框架复用率评估

| 能力模块 | 跨框架复用率 | 说明 |
|---------|------------|------|
| 硬编码中文扫描 | **90%** | 正则匹配逻辑通用，仅文件解析部分需适配 |
| 不可转换中文检测 | **95%** | 纯文本分析，几乎完全通用 |
| 重复翻译检测 | **85%** | JSON 文件分析通用，key 命名规则可能不同 |
| 翻译生成（LLM） | **95%** | 与框架无关，仅 prompt 微调 |
| 翻译质量检查 | **95%** | 纯文本对比，完全通用 |
| 代码替换 | **30%** | 模板语法差异大，需要重写替换逻辑 |
| 响应式问题检测 | **20%** | 响应式机制完全不同，需要重写检测规则 |
| 配置/初始化检查 | **15%** | 各框架初始化方式差异大 |
| UI 库 locale 接入 | **10%** | 每个 UI 库接入方式不同 |
| 微前端同步检查 | **10%** | 每个微前端方案通信机制不同 |

**综合评估**：

- **框架无关能力**（约 40% 代码量）：90%+ 可复用
- **框架相关能力**（约 60% 代码量）：10-30% 可复用

**结论**：如果要跨框架使用，大约 **40-50% 的核心逻辑需要重写**。

---

## 7. 跨语言适配（后端国际化）

| 对比维度 | Java | Python | Go | Node.js |
|---------|------|--------|----|---------|
| **常用 i18n 库** | Spring MessageSource | gettext / Babel | go-i18n | i18next / node-polyglot |
| **文件格式** | .properties / .yml | .po / .mo | .toml / .json | .json |
| **核心差异** | ResourceBundle 机制 | gettext 标准 | 编译时类型安全 | 与前端 i18next 共享生态 |

**适配成本**：每个后端语言需要 **60-80 小时**

---

## 8. 架构设计建议

推荐采用**分层 + 插件化**架构：

```
i18n-tool/
├── core/                          # 核心层（框架无关）
│   ├── scanner/                   # 硬编码扫描引擎
│   ├── translator/                # 翻译生成引擎（LLM）
│   ├── checker/                   # 翻译质量检查
│   ├── detector/                  # 重复/不可转换检测
│   └── types/                     # 通用类型定义
├── adapters/                      # 适配器层（框架相关）
│   ├── vue3/                      # Vue 3 适配器
│   │   ├── ast-parser.ts          # Vue SFC AST 解析
│   │   ├── code-replacer.ts       # 模板代码替换
│   │   ├── reactive-checker.ts    # 响应式问题检测
│   │   └── config-checker.ts      # vue-i18n 配置检查
│   ├── react/                     # React 适配器（未来）
│   ├── angular/                   # Angular 适配器（未来）
│   └── svelte/                    # Svelte 适配器（未来）
├── cli/                           # CLI 入口
├── mcp-server/                    # MCP Server 入口
└── skill/                         # Claude Code Skill 入口
```

**关键设计原则**：

- **核心层完全框架无关**：扫描、翻译、质量检查等逻辑不依赖任何框架
- **适配器可插拔**：每个框架实现统一的 Adapter 接口，运行时按需加载
- **渐进式支持**：先深度支持一个框架，再逐步扩展
- **统一接口**：所有适配器遵循相同的输入输出契约，CLI/MCP/Skill 层无需感知框架差异

---

## 9. 开发优先级建议

| 阶段 | 目标 | 技术栈 | 开发成本 |
|------|------|--------|---------|
| **Phase 1**（当前项目） | 仅支持 Vue 3 + vue-i18n + Element Plus | Vue 3 生态 | 200-280h |
| **Phase 2**（扩展前端框架） | 新增 React + react-i18next + Ant Design | React 生态 | 120-150h |
| **Phase 3**（扩展 UI 库） | 新增 Vuetify, MUI, PrimeNG | 多 UI 库 | 每个 20-30h |
| **Phase 4**（扩展后端） | 新增 Java / Python / Go | 后端语言 | 每个 60-80h |

---

## 10. 总结

**当前工具定位**：专注 Vue 3 生态，深度优化，快速落地。

**跨框架扩展路径**：

- **短期**：仅支持 Vue 3，把工具做到足够好用和稳定
- **中期**：扩展 React 生态，覆盖最大的前端用户群体
- **长期**：支持更多框架和后端语言，成为通用 i18n 工具

**关键决策**：

- 先做深再做广，避免过早泛化导致每个框架都做不好
- 需求驱动，有实际项目需求时再启动对应适配器开发
- 架构预留，Phase 1 就按分层架构设计，降低后续扩展成本

**投入产出比**：

- Vue 3 适配器：**7-12 倍回报**（当前项目直接受益，复用率高）
- React 适配器：**3-5 倍回报**（用户基数大，但需要额外开发投入）

---

## 相关文档

- [README.md](./README.md) - 工具总览与快速开始
- [technical-design.md](./technical-design.md) - 技术设计文档
- [production-guide.md](./production-guide.md) - 生产环境部署指南
