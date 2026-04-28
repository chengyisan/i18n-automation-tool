import { parse as sfcParse } from '@vue/compiler-sfc'
import type { ElementPlusIssue } from '../types.js'

/**
 * Element Plus 国际化适配器
 *
 * 检测 Element Plus 的 locale 配置、ElConfigProvider 配置，以及组件中的硬编码中文
 */
export class ElementPlusAdapter {
  check(source: string, filePath: string): ElementPlusIssue[] {
    const issues: ElementPlusIssue[] = []

    try {
      const { descriptor } = sfcParse(source, { filename: filePath })

      // 检测 template 中的问题
      if (descriptor.template) {
        issues.push(...this.checkTemplate(descriptor.template.content, filePath))
      }

      // 检测 script 中的问题
      const scriptContent = descriptor.script?.content || descriptor.scriptSetup?.content
      if (scriptContent) {
        issues.push(...this.checkScript(scriptContent, filePath))
      }
    } catch {
      // 解析失败时返回空数组
    }

    return issues
  }

  /** 检测 template 中的问题 */
  private checkTemplate(template: string, filePath: string): ElementPlusIssue[] {
    const issues: ElementPlusIssue[] = []

    // 检测是否缺少 ElConfigProvider
    const hasConfigProvider = /El-?ConfigProvider/i.test(template)
    const hasElComponents = /El-?[A-Z][a-zA-Z]+/i.test(template)

    if (hasElComponents && !hasConfigProvider) {
      issues.push({
        type: 'missing-config-provider',
        filePath,
        line: 1,
        message: '检测到 Element Plus 组件但缺少 ElConfigProvider 配置',
        suggestion: '在根组件中添加 <ElConfigProvider :locale="locale">',
      })
    }

    // 检测 Element Plus 组件中的硬编码中文
    issues.push(...this.checkHardcodedProps(template, filePath))

    return issues
  }

  /** 检测 Element Plus 组件属性中的硬编码中文 */
  private checkHardcodedProps(template: string, filePath: string): ElementPlusIssue[] {
    const issues: ElementPlusIssue[] = []

    // 常见的 Element Plus 组件和需要检查的属性
    const componentProps = [
      { component: 'ElInput', props: ['placeholder'] },
      { component: 'ElButton', props: [] }, // 检查文本内容
      { component: 'ElSelect', props: ['placeholder'] },
      { component: 'ElDatePicker', props: ['placeholder', 'start-placeholder', 'end-placeholder'] },
      { component: 'ElTimePicker', props: ['placeholder'] },
      { component: 'ElCascader', props: ['placeholder'] },
      { component: 'ElAutocomplete', props: ['placeholder'] },
    ]

    const lines = template.split('\n')

    lines.forEach((line, index) => {
      componentProps.forEach(({ component, props }) => {
        // 检测组件标签（支持 ElButton 和 el-button 两种格式）
        const kebabComponent = component.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1)
        const componentRegex = new RegExp(`<(${component}|${kebabComponent})`, 'i')

        if (componentRegex.test(line)) {
          // 检测属性中的中文
          props.forEach((prop) => {
            const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
            const propRegex = new RegExp(`${kebabProp}="([^"]*[\u4e00-\u9fa5]+[^"]*)"`, 'i')
            const match = line.match(propRegex)

            if (match && !match[1].includes('t(') && !match[1].includes('$t(')) {
              issues.push({
                type: 'hardcoded-prop',
                filePath,
                line: index + 1,
                message: `${component} 的 ${prop} 属性包含硬编码中文: "${match[1]}"`,
                suggestion: `改为 :${kebabProp}="t('key')"`,
              })
            }
          })

          // 检测按钮文本内容
          if (component === 'ElButton') {
            const textMatch = line.match(/>([^<]*[\u4e00-\u9fa5]+[^<]*)</)
            if (textMatch && !textMatch[1].includes('{{') && !textMatch[1].trim().startsWith('t(')) {
              issues.push({
                type: 'hardcoded-prop',
                filePath,
                line: index + 1,
                message: `${component} 的文本内容包含硬编码中文: "${textMatch[1].trim()}"`,
                suggestion: `改为 {{ t('key') }}`,
              })
            }
          }
        }
      })
    })

    return issues
  }

  /** 检测 script 中的问题 */
  private checkScript(script: string, filePath: string): ElementPlusIssue[] {
    const issues: ElementPlusIssue[] = []

    // 检测是否导入了 ElConfigProvider 但没有导入 locale
    const hasConfigProviderImport = /import\s+{[^}]*ElConfigProvider[^}]*}\s+from\s+['"]element-plus['"]/i.test(script)
    const hasLocaleImport = /import\s+\w+\s+from\s+['"]element-plus\/dist\/locale\//i.test(script)

    if (hasConfigProviderImport && !hasLocaleImport) {
      issues.push({
        type: 'missing-locale-import',
        filePath,
        line: 1,
        message: '导入了 ElConfigProvider 但缺少 Element Plus locale 导入',
        suggestion: "添加 import zhCn from 'element-plus/dist/locale/zh-cn.mjs'",
      })
    }

    return issues
  }
}
