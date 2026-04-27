import type { QualityIssue } from '../types';

/**
 * 冗余表达检测规则
 */
interface RedundancyPattern {
  pattern: RegExp;
  message: string;
  suggestion: string;
}

/**
 * 冗余表达检测器
 *
 * 检测翻译中的冗余表达，提供简化建议
 */
export class RedundancyChecker {
  private patterns: RedundancyPattern[] = [
    {
      pattern: /\bplease\s+kindly\b/gi,
      message: '冗余表达：please 和 kindly 重复',
      suggestion: '使用 please 或 kindly 其中之一',
    },
    {
      pattern: /\bbasic\s+fundamentals\b/gi,
      message: '冗余表达：basic 和 fundamentals 意思重复',
      suggestion: '使用 basics 或 fundamentals',
    },
    {
      pattern: /\bfree\s+gift\b/gi,
      message: '冗余表达：gift 本身就是免费的',
      suggestion: '使用 gift',
    },
    {
      pattern: /\badvance\s+planning\b/gi,
      message: '冗余表达：planning 本身就是提前的',
      suggestion: '使用 planning',
    },
    {
      pattern: /\bfuture\s+plans\b/gi,
      message: '冗余表达：plans 本身就是关于未来的',
      suggestion: '使用 plans',
    },
    {
      pattern: /\bpast\s+history\b/gi,
      message: '冗余表达：history 本身就是过去的',
      suggestion: '使用 history',
    },
    {
      pattern: /\brepeat\s+again\b/gi,
      message: '冗余表达：repeat 本身就包含 again 的意思',
      suggestion: '使用 repeat',
    },
    {
      pattern: /\breturn\s+back\b/gi,
      message: '冗余表达：return 本身就包含 back 的意思',
      suggestion: '使用 return',
    },
    {
      pattern: /\bclose\s+proximity\b/gi,
      message: '冗余表达：proximity 本身就表示接近',
      suggestion: '使用 proximity 或 close',
    },
    {
      pattern: /\bend\s+result\b/gi,
      message: '冗余表达：result 本身就是结果',
      suggestion: '使用 result 或 outcome',
    },
  ];

  /**
   * 检查文本中的冗余表达
   */
  check(text: string): QualityIssue[] {
    const issues: QualityIssue[] = [];

    for (const { pattern, message, suggestion } of this.patterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        if (match.index !== undefined) {
          issues.push({
            type: 'redundancy',
            severity: 'info',
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
