import type { CoverageReport, I18nToolConfig } from '../types';
import { ChineseScanner } from '../scanner/ChineseScanner';
import { readFileSync } from 'fs';
import { glob } from 'glob';
import { resolve } from 'path';

/**
 * 覆盖率报告生成器
 *
 * 统计项目中的 i18n 覆盖率
 */
export class CoverageReporter {
  private scanner: ChineseScanner;
  private config: I18nToolConfig;

  constructor(config: I18nToolConfig) {
    this.config = config;
    this.scanner = new ChineseScanner(config);
  }

  /**
   * 生成覆盖率报告
   */
  async generate(projectRoot: string): Promise<CoverageReport> {
    const files = await this.getFilesToScan(projectRoot);

    let totalFiles = 0;
    let filesWithChinese = 0;
    let totalChineseStrings = 0;
    let convertedStrings = 0;
    const fileDetails: CoverageReport['files'] = [];

    for (const file of files) {
      totalFiles++;
      const content = readFileSync(file, 'utf-8');
      const scanResult = this.scanner.scan(content, file);

      const chineseCount = scanResult.strings.length;
      const convertedCount = this.countConvertedStrings(content);

      if (chineseCount > 0) {
        filesWithChinese++;
        totalChineseStrings += chineseCount;
        convertedStrings += convertedCount;

        fileDetails.push({
          path: file,
          totalStrings: chineseCount,
          convertedStrings: convertedCount,
          coverage: chineseCount > 0 ? (convertedCount / chineseCount) * 100 : 100,
        });
      }
    }

    const overallCoverage =
      totalChineseStrings > 0 ? (convertedStrings / totalChineseStrings) * 100 : 100;

    return {
      totalFiles,
      filesWithChinese,
      totalChineseStrings,
      convertedStrings,
      coverage: overallCoverage,
      files: fileDetails.sort((a, b) => a.coverage - b.coverage), // 按覆盖率升序排序
    };
  }

  /**
   * 获取需要扫描的文件列表
   */
  private async getFilesToScan(projectRoot: string): Promise<string[]> {
    const patterns = this.config.scan?.include || ['**/*.{vue,js,ts,jsx,tsx}'];
    const exclude = this.config.scan?.exclude || ['**/node_modules/**', '**/dist/**'];

    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectRoot,
        absolute: true,
        ignore: exclude,
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // 去重
  }

  /**
   * 统计已转换的字符串数量（包含 t() 或 $t() 调用）
   */
  private countConvertedStrings(content: string): number {
    // 匹配 t('key') 或 $t('key') 或 t("key") 或 $t("key")
    const tCallPattern = /\$?t\s*\(\s*['"`][^'"`]+['"`]\s*\)/g;
    const matches = content.match(tCallPattern);
    return matches ? matches.length : 0;
  }
}
