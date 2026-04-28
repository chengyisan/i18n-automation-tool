import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { ConfigLoader, DEFAULT_CONFIG } from '@i18n-tool/core'
import type { I18nToolConfig } from '@i18n-tool/core'

/**
 * 加载配置文件
 * 优先使用命令行指定的路径，否则查找 .i18nrc.json
 */
export function loadConfig(configPath?: string): I18nToolConfig {
  const finalPath = configPath || resolve(process.cwd(), '.i18nrc.json')

  if (!existsSync(finalPath)) {
    return DEFAULT_CONFIG
  }

  try {
    const content = readFileSync(finalPath, 'utf-8')
    const userConfig = JSON.parse(content) as Partial<I18nToolConfig>
    return ConfigLoader.mergeConfig(userConfig, DEFAULT_CONFIG)
  } catch {
    return DEFAULT_CONFIG
  }
}
