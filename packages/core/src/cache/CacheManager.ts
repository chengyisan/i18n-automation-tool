import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { CacheConfig } from '../types';

/**
 * 翻译缓存条目
 */
interface CacheEntry {
  key: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * 翻译缓存管理器
 *
 * 使用 SQLite 存储翻译结果，避免重复调用翻译 API
 * 支持 TTL 过期、批量操作、统计信息
 */
export class CacheManager {
  private db: Database.Database;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;

    // 确保缓存目录存在
    const cacheDir = dirname(config.path);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    // 初始化数据库
    this.db = new Database(config.path);
    this.initDatabase();

    // 定期清理过期缓存
    if (config.ttl > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * 初始化数据库表结构
   */
  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS translations (
        key TEXT PRIMARY KEY,
        source_text TEXT NOT NULL,
        target_text TEXT NOT NULL,
        source_lang TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_expires_at ON translations(expires_at);
      CREATE INDEX IF NOT EXISTS idx_source_target ON translations(source_lang, target_lang);
    `);
  }

  /**
   * 生成缓存键
   */
  private generateKey(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    provider: string
  ): string {
    const content = `${sourceText}|${sourceLang}|${targetLang}|${provider}`;
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * 获取缓存的翻译结果
   */
  get(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    provider: string
  ): string | null {
    const key = this.generateKey(sourceText, sourceLang, targetLang, provider);
    const now = Date.now();

    const stmt = this.db.prepare(`
      SELECT target_text, expires_at
      FROM translations
      WHERE key = ? AND expires_at > ?
    `);

    const row = stmt.get(key, now) as { target_text: string; expires_at: number } | undefined;

    return row ? row.target_text : null;
  }

  /**
   * 设置缓存的翻译结果
   */
  set(
    sourceText: string,
    targetText: string,
    sourceLang: string,
    targetLang: string,
    provider: string
  ): void {
    const key = this.generateKey(sourceText, sourceLang, targetLang, provider);
    const now = Date.now();
    const expiresAt = this.config.ttl > 0 ? now + this.config.ttl : Number.MAX_SAFE_INTEGER;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO translations
      (key, source_text, target_text, source_lang, target_lang, provider, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(key, sourceText, targetText, sourceLang, targetLang, provider, now, expiresAt);
  }

  /**
   * 批量获取缓存
   */
  getMany(
    items: Array<{
      sourceText: string;
      sourceLang: string;
      targetLang: string;
      provider: string;
    }>
  ): Map<string, string> {
    const result = new Map<string, string>();
    const now = Date.now();

    const stmt = this.db.prepare(`
      SELECT key, target_text
      FROM translations
      WHERE key = ? AND expires_at > ?
    `);

    for (const item of items) {
      const key = this.generateKey(
        item.sourceText,
        item.sourceLang,
        item.targetLang,
        item.provider
      );
      const row = stmt.get(key, now) as { target_text: string } | undefined;

      if (row) {
        result.set(item.sourceText, row.target_text);
      }
    }

    return result;
  }

  /**
   * 批量设置缓存
   */
  setMany(
    items: Array<{
      sourceText: string;
      targetText: string;
      sourceLang: string;
      targetLang: string;
      provider: string;
    }>
  ): void {
    const now = Date.now();
    const expiresAt = this.config.ttl > 0 ? now + this.config.ttl : Number.MAX_SAFE_INTEGER;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO translations
      (key, source_text, target_text, source_lang, target_lang, provider, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((entries: typeof items) => {
      for (const item of entries) {
        const key = this.generateKey(
          item.sourceText,
          item.sourceLang,
          item.targetLang,
          item.provider
        );
        stmt.run(
          key,
          item.sourceText,
          item.targetText,
          item.sourceLang,
          item.targetLang,
          item.provider,
          now,
          expiresAt
        );
      }
    });

    transaction(items);
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    const stmt = this.db.prepare('DELETE FROM translations WHERE expires_at <= ?');
    const result = stmt.run(now);
    return result.changes;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.db.exec('DELETE FROM translations');
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    total: number;
    expired: number;
    byProvider: Record<string, number>;
    byLanguagePair: Record<string, number>;
  } {
    const now = Date.now();

    const total = (
      this.db.prepare('SELECT COUNT(*) as count FROM translations').get() as { count: number }
    ).count;

    const expired = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM translations WHERE expires_at <= ?')
        .get(now) as { count: number }
    ).count;

    const byProvider: Record<string, number> = {};
    const providerRows = this.db
      .prepare('SELECT provider, COUNT(*) as count FROM translations GROUP BY provider')
      .all() as Array<{ provider: string; count: number }>;

    for (const row of providerRows) {
      byProvider[row.provider] = row.count;
    }

    const byLanguagePair: Record<string, number> = {};
    const langRows = this.db
      .prepare(
        'SELECT source_lang, target_lang, COUNT(*) as count FROM translations GROUP BY source_lang, target_lang'
      )
      .all() as Array<{ source_lang: string; target_lang: string; count: number }>;

    for (const row of langRows) {
      const pair = `${row.source_lang}->${row.target_lang}`;
      byLanguagePair[pair] = row.count;
    }

    return { total, expired, byProvider, byLanguagePair };
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    // 每小时清理一次过期缓存
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}

