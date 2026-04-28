import { writeFileSync } from 'fs'
import { resolve } from 'path'
import inquirer from 'inquirer'
import { logger } from '../utils/logger.js'

export async function initCommand() {
  logger.info('初始化 i18n 配置文件')

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'locales',
      message: '支持的语言（逗号分隔）:',
      default: 'zh-CN,en-US',
    },
    {
      type: 'input',
      name: 'defaultLocale',
      message: '默认语言:',
      default: 'zh-CN',
    },
    {
      type: 'input',
      name: 'langDir',
      message: '语言包目录:',
      default: 'src/lang',
    },
    {
      type: 'confirm',
      name: 'qualityChecks',
      message: '启用翻译质量检查?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'reactiveChecks',
      message: '启用响应式问题检查?',
      default: true,
    },
  ])

  const config = {
    locales: answers.locales.split(',').map((l: string) => l.trim()),
    defaultLocale: answers.defaultLocale,
    langDir: answers.langDir,
    exclude: ['**/node_modules/**', '**/dist/**'],
    keyPrefix: '',
    translationService: 'local',
    qualityChecks: {
      chinglish: answers.qualityChecks,
      redundantExpressions: answers.qualityChecks,
      rtlConcatenation: answers.qualityChecks,
    },
    reactiveChecks: {
      staticObjectWithT: answers.reactiveChecks,
      refAssignmentWithT: answers.reactiveChecks,
    },
    layoutChecks: {
      fixedWidth: true,
      tableColumnWidth: true,
    },
    untranslatablePatterns: {
      backendValues: ['value', 'code', 'status', 'type'],
      imageExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'],
      svgTextNodes: true,
    },
    sharedTranslationDetection: {
      enabled: true,
      minOccurrences: 3,
      suggestMerge: true,
    },
    security: {
      translationMode: 'local',
      sensitivePatterns: ['password', 'token', 'secret', 'key', 'apiKey'],
      requireApproval: true,
    },
    performance: {
      parallelScan: { enabled: true, maxWorkers: 4 },
      translationCache: { enabled: true, path: '.i18n-cache', ttl: '7d' },
      batchTranslation: { enabled: true, batchSize: 50 },
    },
  }

  const configPath = resolve(process.cwd(), '.i18nrc.json')
  writeFileSync(configPath, JSON.stringify(config, null, 2))

  logger.success(`配置文件已创建: ${configPath}`)
}
