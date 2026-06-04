#!/usr/bin/env node
import { Command } from 'commander'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { scanCommand } from './commands/scan.js'
import { validateCommand } from './commands/validate.js'
import { reportCommand } from './commands/report.js'
import { checkReactiveCommand } from './commands/checkReactive.js'
import { checkQualityCommand } from './commands/checkQuality.js'
import { checkLayoutCommand } from './commands/checkLayout.js'
import { initCommand } from './commands/init.js'
import { fixCommand } from './commands/fix.js'
import { translateCommand } from './commands/translate.js'

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', 'package.json'), 'utf-8')
)

const program = new Command()

program
  .name('i18n-tool')
  .description('国际化自动化工具 — 扫描、替换、翻译、验证一站式 i18n 工具链')
  .version(pkg.version)
  .option('-c, --config <path>', '配置文件路径', '.i18nrc.json')

program
  .command('scan [path]')
  .description('扫描硬编码中文')
  .option('--json', '以 JSON 格式输出')
  .option('--include-comments', '包含注释中的中文')
  .action(scanCommand)

program
  .command('validate [path]')
  .description('验证 i18n 配置和语言包完整性')
  .option('--json', '以 JSON 格式输出')
  .action(validateCommand)

program
  .command('report [path]')
  .description('生成覆盖率报告')
  .option('--json', '以 JSON 格式输出')
  .action(reportCommand)

program
  .command('check-reactive [path]')
  .description('检查 t() 响应式问题')
  .option('--json', '以 JSON 格式输出')
  .action(checkReactiveCommand)

program
  .command('fix [path]')
  .description('交互式修复硬编码中文，替换为 t() 调用')
  .option('--dry-run', '预览模式，不实际写入文件')
  .option('--auto', '自动批量替换，跳过确认')
  .option('--file <path>', '只处理指定文件')
  .option('--json', '以 JSON 格式输出')
  .action(fixCommand)

program
  .command('translate [path]')
  .description('批量翻译语言包')
  .option('--locale <code>', '只翻译指定语言')
  .option('--dry-run', '预览模式，不实际写入文件')
  .option('--json', '以 JSON 格式输出')
  .action(translateCommand)

// PLACEHOLDER_CLI_COMMANDS

program
  .command('check-quality [path]')
  .description('翻译质量检查')
  .option('--json', '以 JSON 格式输出')
  .option('--locale <code>', '指定检查的语言')
  .action(checkQualityCommand)

program
  .command('check-layout [path]')
  .description('CSS 多语言适配检查')
  .option('--json', '以 JSON 格式输出')
  .action(checkLayoutCommand)

program
  .command('init')
  .description('初始化 .i18nrc.json 配置文件')
  .action(initCommand)

program.parse()
