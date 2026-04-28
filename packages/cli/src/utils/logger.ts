import chalk from 'chalk'

export const logger = {
  info(msg: string) {
    console.log(chalk.blue('ℹ'), msg)
  },
  warn(msg: string) {
    console.log(chalk.yellow('⚠'), msg)
  },
  error(msg: string) {
    console.error(chalk.red('✖'), msg)
  },
  success(msg: string) {
    console.log(chalk.green('✔'), msg)
  },
}
