import type { TranslationConfig, TranslationResult } from '../types';
import { CacheManager } from '../cache/CacheManager';

/**
 * 翻译提供商接口
 */
interface TranslationProvider {
  translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string>;

  translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string
  ): Promise<string[]>;
}

/**
 * Google Translate 提供商
 */
class GoogleTranslateProvider implements TranslationProvider {
  private apiKey: string;
  private endpoint = 'https://translation.googleapis.com/language/translate/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  }

  async translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string
  ): Promise<string[]> {
    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.translations.map((t: { translatedText: string }) => t.translatedText);
  }
}

/**
 * DeepL 提供商
 */
class DeepLProvider implements TranslationProvider {
  private apiKey: string;
  private endpoint = 'https://api-free.deepl.com/v2/translate';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.translations[0].text;
  }

  async translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string
  ): Promise<string[]> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: texts,
        source_lang: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.translations.map((t: { text: string }) => t.text);
  }
}

/**
 * API 翻译器
 *
 * 集成多个翻译 API 提供商，支持缓存、批量翻译、重试机制
 */
export class ApiTranslator {
  private provider: TranslationProvider;
  private cache?: CacheManager;
  private config: TranslationConfig;

  constructor(config: TranslationConfig, cache?: CacheManager) {
    this.config = config;
    this.cache = cache;

    // 初始化翻译提供商
    switch (config.provider) {
      case 'google':
        this.provider = new GoogleTranslateProvider(config.apiKey);
        break;
      case 'deepl':
        this.provider = new DeepLProvider(config.apiKey);
        break;
      default:
        throw new Error(`Unsupported translation provider: ${config.provider}`);
    }
  }

  /**
   * 翻译单个文本
   */
  async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<TranslationResult> {
    // 检查缓存
    if (this.cache) {
      const cached = this.cache.get(text, sourceLang, targetLang, this.config.provider);
      if (cached) {
        return {
          sourceText: text,
          translatedText: cached,
          sourceLang,
          targetLang,
          fromCache: true,
        };
      }
    }

    // 调用 API 翻译
    const translatedText = await this.translateWithRetry(text, sourceLang, targetLang);

    // 写入缓存
    if (this.cache) {
      this.cache.set(text, translatedText, sourceLang, targetLang, this.config.provider);
    }

    return {
      sourceText: text,
      translatedText,
      sourceLang,
      targetLang,
      fromCache: false,
    };
  }

  /**
   * 批量翻译文本
   */
  async translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];
    const toTranslate: string[] = [];
    const toTranslateIndices: number[] = [];

    // 检查缓存
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (this.cache) {
        const cached = this.cache.get(text, sourceLang, targetLang, this.config.provider);
        if (cached) {
          results[i] = {
            sourceText: text,
            translatedText: cached,
            sourceLang,
            targetLang,
            fromCache: true,
          };
          continue;
        }
      }
      toTranslate.push(text);
      toTranslateIndices.push(i);
    }

    // 批量翻译未缓存的文本
    if (toTranslate.length > 0) {
      const translated = await this.translateBatchWithRetry(toTranslate, sourceLang, targetLang);

      // 写入缓存并填充结果
      for (let i = 0; i < translated.length; i++) {
        const text = toTranslate[i];
        const translatedText = translated[i];
        const index = toTranslateIndices[i];

        if (this.cache) {
          this.cache.set(text, translatedText, sourceLang, targetLang, this.config.provider);
        }

        results[index] = {
          sourceText: text,
          translatedText,
          sourceLang,
          targetLang,
          fromCache: false,
        };
      }
    }

    return results;
  }

  /**
   * 带重试的单个翻译
   */
  private async translateWithRetry(
    text: string,
    sourceLang: string,
    targetLang: string,
    retries = this.config.retries || 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await this.provider.translate(text, sourceLang, targetLang);
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          // 指数退避
          await this.sleep(Math.pow(2, i) * 1000);
        }
      }
    }

    throw new Error(`Translation failed after ${retries} retries: ${lastError?.message}`);
  }

  /**
   * 带重试的批量翻译
   */
  private async translateBatchWithRetry(
    texts: string[],
    sourceLang: string,
    targetLang: string,
    retries = this.config.retries || 3
  ): Promise<string[]> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await this.provider.translateBatch(texts, sourceLang, targetLang);
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await this.sleep(Math.pow(2, i) * 1000);
        }
      }
    }

    throw new Error(`Batch translation failed after ${retries} retries: ${lastError?.message}`);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

