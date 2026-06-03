import { glob } from 'glob'

/**
 * 根据配置收集目标文件
 * @param rootDir 项目根目录（绝对路径）
 * @param include 包含的文件模式（默认扫描 Vue/JS/TS 文件）
 * @param exclude 排除的文件模式（默认排除 node_modules 和 dist）
 */
export async function discoverFiles(
  rootDir: string,
  include: string[] = ['**/*.{vue,js,ts,jsx,tsx}'],
  exclude: string[] = ['**/node_modules/**', '**/dist/**']
): Promise<string[]> {
  const files: string[] = []

  for (const pattern of include) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: exclude,
    })
    files.push(...matches)
  }

  // 去重
  return [...new Set(files)]
}
