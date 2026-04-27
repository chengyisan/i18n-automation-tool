import { existsSync } from 'fs';
import { resolve } from 'path';
import type { I18nToolConfig, ValidationIssue } from '../types';

/**
 * 配置验证器
 *
 * 验证 i18n 配置的完整性和正确性
 */
export class ConfigValidator {
  /**
   * 验证配置
   */
  validate(config: I18nToolConfig, projectRoot: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 验证语言包路径
    issues.push(...this.validateLocalePaths(config, projectRoot));

    // 验证语言代码
    issues.push(...this.validateLocales(config));

    // 验证翻译配置
    if (config.translation) {
      issues.push(...this.validateTranslationConfig(config));
    }

    // 验证缓存配置
    if (config.cache) {
      issues.push(...this.validateCacheConfig(config));
    }

    // 验证扫描配置
    if (config.scan) {
      issues.push(...this.validateScanConfig(config));
    }

    return issues;
  }

  /**
   * 验证语言包路径
   */
  private validateLocalePaths(config: I18nToolConfig, projectRoot: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const locale of config.locales) {
      const localePath = resolve(projectRoot, config.localeDir, `${locale}.json`);

      if (!existsSync(localePath)) {
        issues.push({
          type: 'missing_locale_file',
          severity: 'error',
          message: `语言包文件不存在: ${localePath}`,
          suggestion: `创建 ${locale}.json 文件`,
          path: localePath,
        });
      }
    }

    return issues;
  }

  /**
   * 验证语言代码
   */
  private validateLocales(config: I18nToolConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (config.locales.length === 0) {
      issues.push({
        type: 'invalid_config',
        severity: 'error',
        message: '至少需要配置一个语言',
        suggestion: '在 locales 数组中添加语言代码，如 ["zh-CN", "en-US"]',
      });
    }

    // 验证语言代码格式（BCP 47）
    const bcp47Pattern = /^[a-z]{2,3}(-[A-Z]{2})?$/;
    for (const locale of config.locales) {
      if (!bcp47Pattern.test(locale)) {
        issues.push({
          type: 'invalid_locale',
          severity: 'warning',
          message: `语言代码格式不符合 BCP 47 标准: ${locale}`,
          suggestion: `使用标准格式，如 zh-CN, en-US, es-ES`,
        });
      }
    }

    return issues;
  }

  /**
   * 验证翻译配置
   */
  private validateTranslationConfig(config: I18nToolConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const translation = config.translation!;

    if (!translation.apiKey) {
      issues.push({
        type: 'invalid_config',
        severity: 'error',
        message: '翻译 API Key 未配置',
        suggestion: '在 translation.apiKey 中配置 API Key',
      });
    }

    if (!['google', 'deepl'].includes(translation.provider)) {
      issues.push({
        type: 'invalid_config',
        severity: 'error',
        message: `不支持的翻译提供商: ${translation.provider}`,
        suggestion: '使用 google 或 deepl',
      });
    }

    if (translation.retries !== undefined && translation.retries < 0) {
      issues.push({
        type: 'invalid_config',
        severity: 'warning',
        message: '重试次数不能为负数',
        suggestion: '设置为 0 或正整数',
      });
    }

    return issues;
  }

  /**
   * 验证缓存配置
   */
  private validateCacheConfig(config: I18nToolConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const cache = config.cache!;

    if (!cache.path) {
      issues.push({
        type: 'invalid_config',
        severity: 'error',
        message: '缓存路径未配置',
        suggestion: '在 cache.path 中配置缓存文件路径',
      });
    }

    if (cache.ttl !== undefined && cache.ttl < 0) {
      issues.push({
        type: 'invalid_config',
        severity: 'warning',
        message: 'TTL 不能为负数',
        suggestion: '设置为 0（永不过期）或正整数（毫秒）',
      });
    }

    return issues;
  }

  /**
   * 验证扫描配置
   */
  private validateScanConfig(config: I18nToolConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const scan = config.scan!;

    if (scan.include && scan.include.length === 0) {
      issues.push({
        type: 'invalid_config',
        severity: 'warning',
        message: 'include 数组为空',
        suggestion: '添加需要扫描的文件模式，如 ["src/**/*.vue"]',
      });
    }

    return issues;
  }
}
