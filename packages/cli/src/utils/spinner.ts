import ora, { type Ora } from 'ora'

let current: Ora | null = null

export const spinner = {
  start(msg: string): Ora {
    current = ora(msg).start()
    return current
  },
  succeed(msg: string) {
    current?.succeed(msg)
    current = null
  },
  fail(msg: string) {
    current?.fail(msg)
    current = null
  },
}
