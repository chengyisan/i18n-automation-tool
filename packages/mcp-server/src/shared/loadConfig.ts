import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { ConfigLoader, DEFAULT_CONFIG } from '@i18n-tool/core'
import type { I18nToolConfig } from '@i18n-tool/core'

/**
 * 加载配置文件
 * 优先使用 configPath，否则从 rootPath 向上递归查找 .i18nrc.json
 */
export function loadConfig(rootPath: string, configPath?: string): I18nToolConfig {
  // 如果显式指定配置路径，直接加载
  if (configPath) {
    if (!existsSync(configPath)) {
      throw new Error(`配置文件不存在: ${configPath}`)
    }
    return loadConfigFromPath(configPath)
  }

  // 从 rootPath 向上递归查找 .i18nrc.json
  let currentDir = resolve(rootPath)
  while (true) {
    const configFilePath = resolve(currentDir, '.i18nrc.json')
    if (existsSync(configFilePath)) {
      return loadConfigFromPath(configFilePath)
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      // 已到根目录，未找到配置
      return DEFAULT_CONFIG
    }
    currentDir = parentDir
  }
}

/**
 * 从指定路径加载配置
 */
function loadConfigFromPath(filePath: string): I18nToolConfig {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const userConfig = JSON.parse(content) as Partial<I18nToolConfig>
    return ConfigLoader.mergeConfig(userConfig, DEFAULT_CONFIG)
  } catch (error) {
    throw new Error(`配置文件解析失败: ${(error as Error).message}`)
  }
}
