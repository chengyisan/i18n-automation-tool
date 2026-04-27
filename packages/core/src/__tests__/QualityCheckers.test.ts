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
