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
    // i18n 场景高频中式英语
    {
      pattern: /\bplease\s+input\b/gi,
      message: '避免使用 "please input"（中文"请输入"的直译）',
      suggestion: '使用 Enter',
    },
    {
      pattern: /\bplease\s+confirm\s+whether\s+to\b/gi,
      message: '避免使用 "please confirm whether to"',
      suggestion: '直接用动词短语，如 Delete this item?',
    },
    {
      // 排除 "please input" 避免重复匹配
      pattern: /(?<!\bplease\s)\binput\s+[a-z]/gi,
      message: '避免在 placeholder 中使用 "input"',
      suggestion: '使用 Enter',
    },
    {
      pattern: /\boperation\s+failed\b/gi,
      message: '避免使用 "operation failed"',
      suggestion: '使用 Failed 或具体错误描述',
    },
    {
      pattern: /\bno\s+data\b/gi,
      message: '避免使用 "no data"（中文"暂无数据"的直译）',
      suggestion: '使用 No results 或 Nothing here',
    },
    {
      pattern: /\bloading\s+data\b/gi,
      message: '避免使用 "loading data"',
      suggestion: '使用 Loading...',
    },
    {
      pattern: /\bmodify\b/gi,
      message: '避免在按钮文案中使用 "modify"（中文"修改"的直译）',
      suggestion: '使用 Edit',
    },
    {
      pattern: /\b(new\s+add|add\s+new)\b/gi,
      message: '避免使用 "new add" 或 "add new"',
      suggestion: '使用 Add 或 Create',
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
