import { describe, it, expect } from 'vitest'
import { MenuKeyChecker } from '../quality/MenuKeyChecker'

describe('MenuKeyChecker', () => {
  const checker = new MenuKeyChecker()

  it('应该检测 menu.1 纯数字 key', () => {
    const issues = checker.check('menu.1')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('menu-key-semantic')
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].message).toContain('menu.1')
  })

  it('应该检测 nav.2 纯数字 key', () => {
    const issues = checker.check('nav.2')

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('menu-key-semantic')
  })

  it('应该检测嵌套数字 key menu.item.1', () => {
    const issues = checker.check('menu.item.1')

    expect(issues).toHaveLength(1)
    expect(issues[0].message).toContain('menu.item.1')
  })

  it('应该检测 nav.sub.3', () => {
    const issues = checker.check('nav.sub.3')

    expect(issues).toHaveLength(1)
  })

  it('不应报告非菜单 key common.1', () => {
    const issues = checker.check('common.1')

    expect(issues).toHaveLength(0)
  })

  it('不应报告语义化 key menu.home', () => {
    const issues = checker.check('menu.home')

    expect(issues).toHaveLength(0)
  })

  it('不应报告语义化 key nav.about', () => {
    const issues = checker.check('nav.about')

    expect(issues).toHaveLength(0)
  })

  it('不应报告混合命名 menu.item.settings', () => {
    const issues = checker.check('menu.item.settings')

    expect(issues).toHaveLength(0)
  })

  it('不应报告不相关的 key', () => {
    const issues = checker.check('button.submit')

    expect(issues).toHaveLength(0)
  })
})
