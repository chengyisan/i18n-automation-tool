import { describe, it, expect } from 'vitest';
import { ConfigValidator } from '../validator/ConfigValidator';
import type { I18nToolConfig } from '../types';

describe('ConfigValidator', () => {
  const validator = new ConfigValidator();

  const validConfig: I18nToolConfig = {
    locales: ['zh-CN', 'en-US'],
    defaultLocale: 'zh-CN',
    localeDir: './locales',
    langDir: './lang',
    exclude: ['node_modules'],
    keyPrefix: 'app',
    translationService: 'google',
    qualityChecks: {
      chinglish: true,
      redundantExpressions: true,
      rtlConcatenation: true,
    },
    reactiveChecks: {
      staticObjectWithT: true,
      refAssignmentWithT: true,
    },
    layoutChecks: {
      fixedWidth: true,
      tableColumnWidth: true,
    },
    untranslatablePatterns: {
      backendValues: [],
      imageExtensions: ['.png', '.jpg'],
      svgTextNodes: true,
    },
    sharedTranslationDetection: {
      enabled: true,
      minOccurrences: 3,
      suggestMerge: true,
    },
    security: {
      translationMode: 'api',
      sensitivePatterns: [],
      requireApproval: false,
    },
    performance: {
      parallelScan: { enabled: true, maxWorkers: 4 },
      translationCache: { enabled: true, path: './cache.db', ttl: '7d' },
      batchTranslation: { enabled: true, batchSize: 100 },
    },
    translation: {
      provider: 'google',
      apiKey: 'test-key',
      retries: 3,
    },
    cache: {
      path: './cache.db',
      ttl: 604800000,
    },
  };

  it('应该验证通过有效的配置', () => {
    const issues = validator.validate(validConfig, './test-project');
    const errors = issues.filter((i) => i.severity === 'error');
    // 可能会有 missing_locale_file 错误，因为测试目录不存在语言包文件
    expect(errors.every((e) => e.type === 'missing_locale_file')).toBe(true);
  });

  it('应该检测空的 locales 数组', () => {
    const config = { ...validConfig, locales: [] };
    const issues = validator.validate(config, './test-project');
    const error = issues.find((i) => i.message.includes('至少需要配置一个语言'));
    expect(error).toBeDefined();
    expect(error?.severity).toBe('error');
  });

  it('应该检测无效的语言代码格式', () => {
    const config = { ...validConfig, locales: ['zh', 'en', 'invalid-code-123'] };
    const issues = validator.validate(config, './test-project');
    const warnings = issues.filter((i) => i.type === 'invalid_locale');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('应该检测缺失的翻译 API Key', () => {
    const config = {
      ...validConfig,
      translation: {
        provider: 'google' as const,
        apiKey: '',
      },
    };
    const issues = validator.validate(config, './test-project');
    const error = issues.find((i) => i.message.includes('API Key'));
    expect(error).toBeDefined();
    expect(error?.severity).toBe('error');
  });

  it('应该检测不支持的翻译提供商', () => {
    const config = {
      ...validConfig,
      translation: {
        provider: 'unsupported' as any,
        apiKey: 'test-key',
      },
    };
    const issues = validator.validate(config, './test-project');
    const error = issues.find((i) => i.message.includes('不支持的翻译提供商'));
    expect(error).toBeDefined();
  });

  it('应该检测负数的重试次数', () => {
    const config = {
      ...validConfig,
      translation: {
        provider: 'google' as const,
        apiKey: 'test-key',
        retries: -1,
      },
    };
    const issues = validator.validate(config, './test-project');
    const warning = issues.find((i) => i.message.includes('重试次数'));
    expect(warning).toBeDefined();
  });

  it('应该检测缺失的缓存路径', () => {
    const config = {
      ...validConfig,
      cache: {
        path: '',
        ttl: 60000,
      },
    };
    const issues = validator.validate(config, './test-project');
    const error = issues.find((i) => i.message.includes('缓存路径'));
    expect(error).toBeDefined();
  });
});
