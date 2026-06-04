#!/usr/bin/env node

/**
 * 安装 i18n skill commands 到目标项目的 .claude/commands/ 目录
 *
 * 用法：
 *   npx @i18n-tool/skill install [target-dir]
 *   node packages/skill/scripts/install.js [target-dir]
 */

import { cpSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsSource = resolve(__dirname, '../commands')
const targetDir = process.argv[2] || process.cwd()
const targetCommands = resolve(targetDir, '.claude/commands')

// 确保目标目录存在
mkdirSync(targetCommands, { recursive: true })

// 复制所有 command 文件
const files = readdirSync(commandsSource).filter(f => f.endsWith('.md'))
let installed = 0

for (const file of files) {
  const source = join(commandsSource, file)
  const target = join(targetCommands, file)

  if (existsSync(target)) {
    process.stdout.write(`  跳过 ${file}（已存在）\n`)
  } else {
    cpSync(source, target)
    process.stdout.write(`  安装 ${file}\n`)
    installed++
  }
}

process.stdout.write(`\n完成！安装了 ${installed} 个命令到 ${targetCommands}\n`)
process.stdout.write(`可用命令: ${files.map(f => '/' + f.replace('.md', '')).join(', ')}\n`)
