import type { ScanResult, DuplicateKey } from '../types';

/**
 * 检测选项
 */
interface DetectOptions {
  /** 最小出现次数阈值（默认 2） */
  minOccurrences?: number;
  /** 是否跨文件检测（默认 true） */
  crossFile?: boolean;
  /** 最小字符串长度（默认 2） */
  minLength?: number;
}

/**
 * 位置信息
 */
interface Location {
  filePath: string;
  line: number;
}

/**
 * 重复翻译检测器
 *
 * 检测项目中重复出现的中文字符串，识别可以提取为共享翻译的文本
 */
export class DuplicateDetector {
  /**
   * 检测重复的翻译
   */
  detect(scanResults: ScanResult[], options: DetectOptions = {}): DuplicateKey[] {
    const {
      minOccurrences = 2,
      crossFile = true,
      minLength = 2,
    } = options;

    // 聚合字符串
    const stringMap = this.aggregateStrings(scanResults, crossFile);

    // 检测重复
    const duplicates = this.detectDuplicates(stringMap, minOccurrences, minLength);

    return duplicates;
  }

  /**
   * 聚合字符串，统计每个字符串的出现位置
   */
  private aggregateStrings(
    scanResults: ScanResult[],
    crossFile: boolean
  ): Map<string, Location[]> {
    const stringMap = new Map<string, Location[]>();

    if (crossFile) {
      // 跨文件检测：聚合所有文件的字符串
      for (const result of scanResults) {
        this.addStringsToMap(result, stringMap);
      }
    } else {
      // 单文件检测：每个文件独立检测
      for (const result of scanResults) {
        const fileMap = new Map<string, Location[]>();
        this.addStringsToMap(result, fileMap);

        // 合并到总 map
        for (const [text, locations] of fileMap) {
          if (!stringMap.has(text)) {
            stringMap.set(text, []);
          }
          stringMap.get(text)!.push(...locations);
        }
      }
    }

    return stringMap;
  }

  /**
   * 将扫描结果中的字符串添加到 map
   */
  private addStringsToMap(result: ScanResult, map: Map<string, Location[]>): void {
    for (const str of result.hardcodedStrings) {
      const text = str.text.trim();

      // 忽略空字符串
      if (!text) {
        continue;
      }

      if (!map.has(text)) {
        map.set(text, []);
      }

      map.get(text)!.push({
        filePath: result.filePath,
        line: str.line,
      });
    }
  }

  /**
   * 从聚合的字符串 map 中检测重复
   */
  private detectDuplicates(
    stringMap: Map<string, Location[]>,
    minOccurrences: number,
    minLength: number
  ): DuplicateKey[] {
    const duplicates: DuplicateKey[] = [];

    for (const [text, locations] of stringMap) {
      // 过滤：长度不足
      if (text.length < minLength) {
        continue;
      }

      // 过滤：出现次数不足
      if (locations.length < minOccurrences) {
        continue;
      }

      duplicates.push({
        key: this.generateKey(text),
        value: text,
        locations,
        count: locations.length,
      });
    }

    // 按出现次数降序排序
    return duplicates.sort((a, b) => b.count - a.count);
  }

  /**
   * 生成语义化的 key
   */
  private generateKey(text: string): string {
    // 去除标点符号
    const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s]/g, '');

    // 如果文本过长，使用前缀 + 哈希
    if (cleaned.length > 20) {
      const prefix = cleaned.substring(0, 10);
      const hash = this.simpleHash(cleaned);
      return `${prefix}_${hash}`;
    }

    // 简单转换为 camelCase（这里简化处理，实际可以使用拼音库）
    return this.toCamelCase(cleaned);
  }

  /**
   * 转换为 camelCase
   */
  private toCamelCase(text: string): string {
    // 简化实现：直接使用中文作为 key
    // 实际项目中可以集成拼音库（如 pinyin）
    return text;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }
}
