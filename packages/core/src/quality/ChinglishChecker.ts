import type { QualityIssue } from '../types';

/**
 * 中式英语检测规则
 */
interface ChinglishPattern {
  pattern: RegExp;
  message: string;
  suggestion: string;
}

/**
 * 中式英语检测器
 *
 * 检测常见的中式英语表达，提供改进建议
 */
export class ChinglishChecker {
  private patterns: ChinglishPattern[] = [
    {
      pattern: /\bvery\s+very\b/gi,
      message: '避免使用 "very very"',
      suggestion: '使用更强烈的形容词，如 extremely, incredibly',
    },
    {
      pattern: /\bmore\s+and\s+more\b/gi,
      message: '避免使用 "more and more"',
      suggestion: '使用 increasingly',
    },
    {
      pattern: /\bless\s+and\s+less\b/gi,
      message: '避免使用 "less and less"',
      suggestion: '使用 decreasingly',
    },
    {
      pattern: /\bdo\s+not\s+have\b/gi,
      message: '避免使用 "do not have"',
      suggestion: '使用 lack',
    },
    {
      pattern: /\bgive\s+sb\.?\s+sth\.?\b/gi,
      message: '避免使用 "give sb sth" 的直译',
      suggestion: '使用 provide, offer',
    },
    {
      pattern: /\bmake\s+sb\.?\s+do\b/gi,
      message: '避免使用 "make sb do" 的直译',
      suggestion: '使用 cause, enable, allow',
    },
    {
      pattern: /\blet\s+sb\.?\s+do\b/gi,
      message: '避免使用 "let sb do" 的直译',
      suggestion: '使用 allow, enable, permit',
    },
    {
      pattern: /\bopen\s+the\s+(computer|phone|app)\b/gi,
      message: '避免使用 "open" 表示启动设备或应用',
      suggestion: '使用 turn on (设备), launch/start (应用)',
    },
    {
      pattern: /\bclose\s+the\s+(computer|phone)\b/gi,
      message: '避免使用 "close" 表示关闭设备',
      suggestion: '使用 turn off, shut down',
    },
    {
      pattern: /\bsee\s+the\s+(movie|video)\b/gi,
      message: '避免使用 "see" 表示观看',
      suggestion: '使用 watch',
    },
    {
      pattern: /\bhear\s+the\s+(music|song)\b/gi,
      message: '避免使用 "hear" 表示听音乐',
      suggestion: '使用 listen to',
    },
  ];

  /**
   * 检查文本中的中式英语
   */
  check(text: string): QualityIssue[] {
    const issues: QualityIssue[] = [];

    for (const { pattern, message, suggestion } of this.patterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        if (match.index !== undefined) {
          issues.push({
            type: 'chinglish',
            severity: 'warning',
            message,
            suggestion,
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
            context: text.substring(
              Math.max(0, match.index - 20),
              Math.min(text.length, match.index + match[0].length + 20)
            ),
          });
        }
      }
    }

    return issues;
  }
}
