import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger } from '../utils/logger.js'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('应该输出 info 消息', () => {
    logger.info('测试信息')
    expect(console.log).toHaveBeenCalledTimes(1)
  })

  it('应该输出 warn 消息', () => {
    logger.warn('警告信息')
    expect(console.log).toHaveBeenCalledTimes(1)
  })

  it('应该输出 error 消息到 stderr', () => {
    logger.error('错误信息')
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('应该输出 success 消息', () => {
    logger.success('成功信息')
    expect(console.log).toHaveBeenCalledTimes(1)
  })
})
