import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../cache/CacheManager';
import { existsSync, unlinkSync } from 'fs';

describe('CacheManager', () => {
  const testCachePath = './test-cache.db';
  let cacheManager: CacheManager;

  beforeEach(() => {
    // 清理旧的测试缓存文件
    if (existsSync(testCachePath)) {
      unlinkSync(testCachePath);
    }

    cacheManager = new CacheManager({
      path: testCachePath,
      ttl: 60000, // 60 秒
    });
  });

  afterEach(() => {
    cacheManager.close();
    if (existsSync(testCachePath)) {
      unlinkSync(testCachePath);
    }
  });

  it('应该能够设置和获取缓存', () => {
    cacheManager.set('Hello', 'Bonjour', 'en-US', 'fr-FR', 'google');
    const result = cacheManager.get('Hello', 'en-US', 'fr-FR', 'google');
    expect(result).toBe('Bonjour');
  });

  it('应该在缓存不存在时返回 null', () => {
    const result = cacheManager.get('NonExistent', 'en-US', 'fr-FR', 'google');
    expect(result).toBeNull();
  });

  it('应该支持批量设置和获取', () => {
    const items = [
      { sourceText: 'Hello', targetText: 'Bonjour', sourceLang: 'en-US', targetLang: 'fr-FR', provider: 'google' },
      { sourceText: 'World', targetText: 'Monde', sourceLang: 'en-US', targetLang: 'fr-FR', provider: 'google' },
    ];

    cacheManager.setMany(items);

    const results = cacheManager.getMany([
      { sourceText: 'Hello', sourceLang: 'en-US', targetLang: 'fr-FR', provider: 'google' },
      { sourceText: 'World', sourceLang: 'en-US', targetLang: 'fr-FR', provider: 'google' },
    ]);

    expect(results.get('Hello')).toBe('Bonjour');
    expect(results.get('World')).toBe('Monde');
  });

  it('应该能够清空所有缓存', () => {
    cacheManager.set('Hello', 'Bonjour', 'en-US', 'fr-FR', 'google');
    cacheManager.clear();
    const result = cacheManager.get('Hello', 'en-US', 'fr-FR', 'google');
    expect(result).toBeNull();
  });

  it('应该能够获取缓存统计信息', () => {
    cacheManager.set('Hello', 'Bonjour', 'en-US', 'fr-FR', 'google');
    cacheManager.set('World', 'Mundo', 'en-US', 'es-ES', 'deepl');

    const stats = cacheManager.getStats();

    expect(stats.total).toBe(2);
    expect(stats.byProvider['google']).toBe(1);
    expect(stats.byProvider['deepl']).toBe(1);
    expect(stats.byLanguagePair['en-US->fr-FR']).toBe(1);
    expect(stats.byLanguagePair['en-US->es-ES']).toBe(1);
  });

  it('应该能够清理过期缓存', async () => {
    // 创建一个 TTL 为 1ms 的缓存管理器（快速过期）
    const shortTtlCache = new CacheManager({
      path: './test-cache-short.db',
      ttl: 1,
    });

    shortTtlCache.set('Hello', 'Bonjour', 'en-US', 'fr-FR', 'google');

    // 等待过期
    await new Promise((resolve) => setTimeout(resolve, 10));

    const cleaned = shortTtlCache.cleanup();
    expect(cleaned).toBeGreaterThan(0);

    const result = shortTtlCache.get('Hello', 'en-US', 'fr-FR', 'google');
    expect(result).toBeNull();

    shortTtlCache.close();
    if (existsSync('./test-cache-short.db')) {
      unlinkSync('./test-cache-short.db');
    }
  });

  it('应该为不同的提供商使用不同的缓存键', () => {
    cacheManager.set('Hello', 'Bonjour (Google)', 'en-US', 'fr-FR', 'google');
    cacheManager.set('Hello', 'Bonjour (DeepL)', 'en-US', 'fr-FR', 'deepl');

    const googleResult = cacheManager.get('Hello', 'en-US', 'fr-FR', 'google');
    const deeplResult = cacheManager.get('Hello', 'en-US', 'fr-FR', 'deepl');

    expect(googleResult).toBe('Bonjour (Google)');
    expect(deeplResult).toBe('Bonjour (DeepL)');
  });
});
