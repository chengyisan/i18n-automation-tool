import { glob } from 'glob'

/**
 * 根据配置收集目标文件
 */
export async function discoverFiles(
  projectRoot: string,
  include: string[] = ['**/*.{vue,js,ts,jsx,tsx}'],
  exclude: string[] = ['**/node_modules/**', '**/dist/**']
): Promise<string[]> {
  const files: string[] = []

  for (const pattern of include) {
    const matches = await glob(pattern, {
      cwd: projectRoot,
      absolute: true,
      ignore: exclude,
    })
    files.push(...matches)
  }

  return [...new Set(files)]
}
