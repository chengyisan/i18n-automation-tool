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

    // --- 英语 i18n 场景冗余 ---
    {
      pattern: /\bplease\s+input\b/gi,
      message: 'i18n 冗余：please input 在 UI 中过于冗长',
      suggestion: '使用 Enter 或 Type',
    },
    {
      pattern: /\bplease\s+select\b/gi,
      message: 'i18n 冗余：please select 在 UI 中过于冗长',
      suggestion: '使用 Select',
    },
    {
      pattern: /\bplease\s+confirm\s+whether\s+to\b/gi,
      message: 'i18n 冗余：please confirm whether to 过于啰嗦',
      suggestion: '直接用动词，如 Delete?',
    },
    {
      pattern: /\bwhether\s+or\s+not\b/gi,
      message: 'i18n 冗余：whether or not 中 or not 多余',
      suggestion: '去掉 or not，只用 whether',
    },
    {
      pattern: /\boperation\s+success(?:ful)?\b/gi,
      message: 'i18n 冗余：operation success/successful 过于正式',
      suggestion: '使用 Done 或 Saved',
    },
    {
      pattern: /\bare\s+you\s+sure\s+you\s+want\s+to\b/gi,
      message: 'i18n 冗余：are you sure you want to 过于冗长',
      suggestion: '直接用动词，如 Delete this item?',
    },

    // --- 西班牙语冗余 ---
    {
      pattern: /^Por\s+favor\b/gi,
      message: '西班牙语冗余：Por favor 开头在 UI 中不必要',
      suggestion: '直接使用动词开头',
    },
    {
      pattern: /~+/g,
      message: '装饰性符号：翻译文本中不应包含波浪号 ~',
      suggestion: '移除装饰性波浪号',
    },
    {
      pattern: /¡[^!]*!/g,
      message: '西班牙语冗余：UI 文案中过度使用感叹号 ¡...!',
      suggestion: '在 UI 文案中避免使用感叹号',
    },

    // --- 阿拉伯语冗余 ---
    {
      pattern: /^يرجى\s+/g,
      message: '阿拉伯语冗余：يرجى 开头在 UI 中不必要',
      suggestion: '直接使用动词开头',
    },

    // --- 通用规则 ---
    {
      pattern: /^\s+/g,
      message: '格式问题：文本包含前导空格',
      suggestion: '移除文本开头的空格',
    },
    {
      pattern: /\s+$/g,
      message: '格式问题：文本包含尾随空格',
      suggestion: '移除文本末尾的空格',
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
