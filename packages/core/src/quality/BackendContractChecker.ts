import { readFileSync } from 'node:fs';
import type { QualityIssue } from '../types';

/**
 * 后端约定值检测器
 *
 * 检测翻译文件中包含文件扩展名的值，这些值可能是后端约定的固定值（如模板文件名）
 * 避免在全局翻译优化时误改导致后端无法识别
 */
export class BackendContractChecker {
  /** 常见文件扩展名正则（排除 URL 中的扩展名） */
  private readonly fileExtensionPattern = /\.(xlsx|pdf|csv|zip|doc|docx|xls|ppt|pptx)$/i;

  /** URL 检测正则 */
  private readonly urlPattern = /https?:\/\//i;

  /**
   * 检查翻译文件中的后端约定值
   *
   * @param filePath 翻译文件路径（如 `locales/zh/dataCollection.json`）
   * @returns 质量问题列表
   */
  check(filePath: string): QualityIssue[] {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return this.checkContent(content);
    } catch (error) {
      // 文件不存在或无法读取，返回空数组
      return [];
    }
  }

  /**
   * 检查翻译内容中的后端约定值
   *
   * @param content JSON 字符串内容
   * @returns 质量问题列表
   */
  checkContent(content: string): QualityIssue[] {
    const issues: QualityIssue[] = [];

    try {
      const translations = JSON.parse(content);
      this.traverseTranslations(translations, '', issues);
    } catch {
      // JSON 解析失败，返回空数组
      return [];
    }

    return issues;
  }

  /**
   * 递归遍历翻译对象，检测文件扩展名
   *
   * @param obj 当前遍历的对象
   * @param keyPath 当前 key 路径（如 "dataCollection.templateWebCollection"）
   * @param issues 问题列表
   */
  private traverseTranslations(
    obj: unknown,
    keyPath: string,
    issues: QualityIssue[]
  ): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = keyPath ? `${keyPath}.${key}` : key;

      if (typeof value === 'string') {
        this.checkValue(currentPath, value, issues);
      } else if (typeof value === 'object') {
        // 递归检查嵌套对象
        this.traverseTranslations(value, currentPath, issues);
      }
    }
  }

  /**
   * 检查单个翻译值
   *
   * @param key 翻译 key
   * @param value 翻译值
   * @param issues 问题列表
   */
  private checkValue(key: string, value: string, issues: QualityIssue[]): void {
    // 排除 URL 中的文件扩展名
    if (this.urlPattern.test(value)) {
      return;
    }

    // 检测文件扩展名
    const match = value.match(this.fileExtensionPattern);
    if (match) {
      const fileExtension = match[0];
      issues.push({
        type: 'backend-contract',
        severity: 'warning',
        message: `翻译值包含文件扩展名 "${fileExtension}"，疑似后端约定值`,
        suggestion: '建议抽取到独立的 backendContracts.js 文件，通过 spread 语法引入，避免误改',
        context: `"${key}": "${value}"`,
      });
    }
  }
}
