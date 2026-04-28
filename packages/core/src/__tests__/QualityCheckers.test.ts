import { describe, it, expect } from 'vitest';
import { ChinglishChecker } from '../quality/ChinglishChecker';
import { RedundancyChecker } from '../quality/RedundancyChecker';
import { RtlChecker } from '../quality/RtlChecker';

describe('ChinglishChecker', () => {
  const checker = new ChinglishChecker();

  it('应该检测 "very very" 表达', () => {
    const issues = checker.check('This is very very good');
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('chinglish');
    expect(issues[0].message).toContain('very very');
  });

  it('应该检测 "more and more" 表达', () => {
    const issues = checker.check('It becomes more and more difficult');
    expect(issues.length).toBe(1);
    expect(issues[0].suggestion).toContain('increasingly');
  });

  it('应该检测 "open the computer" 表达', () => {
    const issues = checker.check('Please open the computer');
    expect(issues.length).toBe(1);
    expect(issues[0].suggestion).toContain('turn on');
  });

  it('应该检测多个问题', () => {
    const issues = checker.check('Please open the app and see the movie');
    expect(issues.length).toBe(2);
  });

  it('对于正确的英语不应报告问题', () => {
    const issues = checker.check('This is a well-written sentence');
    expect(issues.length).toBe(0);
  });

  // i18n 场景高频中式英语测试
  it('应该检测 "please input" 表达', () => {
    const issues = checker.check('Please input your name');
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('chinglish');
    expect(issues[0].suggestion).toContain('Enter');
  });

  it('应该检测 "no data" 表达', () => {
    const issues = checker.check('No data available');
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain('no data');
    expect(issues[0].suggestion).toContain('No results');
  });

  it('应该检测 "modify" 按钮文案', () => {
    const issues = checker.check('Click to modify');
    expect(issues.length).toBe(1);
    expect(issues[0].suggestion).toContain('Edit');
  });

  it('应该检测 "new add" 表达', () => {
    const issues = checker.check('New add item');
    expect(issues.length).toBe(1);
    expect(issues[0].suggestion).toContain('Add');
  });

  it('应该检测 "add new" 表达', () => {
    const issues = checker.check('Add new record');
    expect(issues.length).toBe(1);
    expect(issues[0].suggestion).toContain('Create');
  });
});

describe('RedundancyChecker', () => {
  const checker = new RedundancyChecker();

  it('应该检测 "please kindly" 冗余', () => {
    const issues = checker.check('Please kindly submit your form');
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('redundancy');
  });

  it('应该检测 "free gift" 冗余', () => {
    const issues = checker.check('Get a free gift today');
    expect(issues.length).toBe(1);
  });

  it('应该检测 "repeat again" 冗余', () => {
    const issues = checker.check('Please repeat again');
    expect(issues.length).toBe(1);
    expect(issues[0].suggestion).toContain('repeat');
  });

  it('对于无冗余的文本不应报告问题', () => {
    const issues = checker.check('This is a clear and concise message');
    expect(issues.length).toBe(0);
  });

  // --- 英语 i18n 场景冗余 ---
  it('应该检测 "please input" i18n 冗余', () => {
    const issues = checker.check('Please input your name');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.type === 'redundancy' && i.suggestion.includes('Enter'))).toBe(
      true
    );
  });

  // --- 西班牙语冗余 ---
  it('应该检测西班牙语 "Por favor" 开头', () => {
    const issues = checker.check('Por favor ingrese su nombre');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes('Por favor'))).toBe(true);
  });

  // --- 阿拉伯语冗余 ---
  it('应该检测阿拉伯语 "يرجى" 开头', () => {
    const issues = checker.check('يرجى إدخال اسمك');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes('يرجى'))).toBe(true);
  });

  // --- 通用规则 ---
  it('应该检测前导空格', () => {
    const issues = checker.check('  Hello world');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes('前导空格'))).toBe(true);
  });

  it('应该检测尾随空格', () => {
    const issues = checker.check('Hello world  ');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes('尾随空格'))).toBe(true);
  });

  it('应该检测装饰性波浪号 ~', () => {
    const issues = checker.check('Welcome~');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes('波浪号'))).toBe(true);
  });
});

describe('RtlChecker', () => {
  const checker = new RtlChecker();

  it('应该检测 RTL 语言中的字符串拼接', () => {
    const code = `const message = "Hello " + name`;
    const issues = checker.check(code, 'ar-SA');
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('rtl');
    expect(issues[0].severity).toBe('error');
  });

  it('应该检测模板字符串拼接', () => {
    const code = 'const message = `Hello ${name}` + " world"';
    const issues = checker.check(code, 'he-IL');
    expect(issues.length).toBe(1);
  });

  it('对于非 RTL 语言不应报告问题', () => {
    const code = `const message = "Hello " + name`;
    const issues = checker.check(code, 'en-US');
    expect(issues.length).toBe(0);
  });

  it('应该检测翻译中插值变量周围缺少空格', () => {
    const translations = {
      greeting: 'مرحبا{name}',
    };
    const issues = checker.checkTranslations(translations, 'ar-SA');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('warning');
  });

  it('对于正确格式的插值不应报告问题', () => {
    const translations = {
      greeting: 'مرحبا {name} !',
    };
    const issues = checker.checkTranslations(translations, 'ar-SA');
    expect(issues.length).toBe(0);
  });
});
