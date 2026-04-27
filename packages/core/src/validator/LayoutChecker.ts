import { readFileSync } from 'fs';
import { glob } from 'glob';
import type { LayoutIssue } from '../types';

/**
 * 布局检查器
 *
 * 检查 CSS 中的固定宽度，提示可能的布局问题
 */
export class LayoutChecker {
  /**
   * 检查项目中的布局问题
   */
  async check(projectRoot: string, patterns: string[] = ['**/*.{css,scss,less,vue}']): Promise<LayoutIssue[]> {
    const files = await this.getFilesToCheck(projectRoot, patterns);
    const issues: LayoutIssue[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      issues.push(...this.checkFile(content, file));
    }

    return issues;
  }

  /**
   * 检查单个文件
   */
  private checkFile(content: string, filePath: string): LayoutIssue[] {
    const issues: LayoutIssue[] = [];

    // 提取 CSS 内容（包括 <style> 标签内的内容）
    const cssContent = this.extractCssContent(content);

    // 检查固定宽度
    issues.push(...this.checkFixedWidth(cssContent, filePath));

    // 检查固定高度
    issues.push(...this.checkFixedHeight(cssContent, filePath));

    return issues;
  }

  /**
   * 提取 CSS 内容
   */
  private extractCssContent(content: string): string {
    // 如果是 Vue 文件，提取 <style> 标签内容
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    if (styleMatch) {
      return styleMatch[1];
    }

    // 否则认为整个文件都是 CSS
    return content;
  }

  /**
   * 检查固定宽度
   */
  private checkFixedWidth(cssContent: string, filePath: string): LayoutIssue[] {
    const issues: LayoutIssue[] = [];

    // 匹配 width: 数字px（排除 100%、auto 等）
    const widthPattern = /width\s*:\s*(\d+)px/g;
    const matches = cssContent.matchAll(widthPattern);

    for (const match of matches) {
      const width = parseInt(match[1]);

      // 只报告较小的固定宽度（可能包含文本）
      if (width < 500) {
        issues.push({
          type: 'fixed_width',
          severity: 'warning',
          message: `固定宽度可能导致文本溢出: width: ${width}px`,
          suggestion: '考虑使用 min-width 或 max-width，或使用弹性布局',
          file: filePath,
          property: 'width',
          value: `${width}px`,
        });
      }
    }

    return issues;
  }

  /**
   * 检查固定高度
   */
  private checkFixedHeight(cssContent: string, filePath: string): LayoutIssue[] {
    const issues: LayoutIssue[] = [];

    // 匹配 height: 数字px
    const heightPattern = /height\s*:\s*(\d+)px/g;
    const matches = cssContent.matchAll(heightPattern);

    for (const match of matches) {
      const height = parseInt(match[1]);

      // 只报告较小的固定高度（可能包含文本）
      if (height < 200) {
        issues.push({
          type: 'fixed_height',
          severity: 'info',
          message: `固定高度可能导致文本溢出: height: ${height}px`,
          suggestion: '考虑使用 min-height，或允许高度自适应',
          file: filePath,
          property: 'height',
          value: `${height}px`,
        });
      }
    }

    return issues;
  }

  /**
   * 获取需要检查的文件列表
   */
  private async getFilesToCheck(projectRoot: string, patterns: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });
      files.push(...matches);
    }

    return [...new Set(files)];
  }
}
