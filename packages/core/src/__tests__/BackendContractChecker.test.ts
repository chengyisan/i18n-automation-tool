import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BackendContractChecker } from '../quality/BackendContractChecker';

describe('BackendContractChecker', () => {
  const checker = new BackendContractChecker();
  const testDir = join(__dirname, '__test_temp__');
  const testFilePath = join(testDir, 'test.json');

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    try {
      if (existsSync(testFilePath)) {
        unlinkSync(testFilePath);
      }
    } catch {
      // 忽略清理错误
    }
  });

  it('应该检测包含 .xlsx 扩展名的翻译值', () => {
    const content = JSON.stringify({
      dataCollection: {
        templateWebCollection: '网页采集模板.xlsx',
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('backend-contract');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('.xlsx');
    expect(issues[0].suggestion).toContain('backendContracts.js');
    expect(issues[0].context).toContain('templateWebCollection');
  });

  it('应该检测包含 .pdf 扩展名的翻译值', () => {
    const content = JSON.stringify({
      export: {
        exportFile: 'DataExport.pdf',
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain('.pdf');
  });

  it('应该检测多个文件扩展名', () => {
    const content = JSON.stringify({
      templates: {
        excelTemplate: '数据模板.xlsx',
        wordDocument: '报告模板.docx',
        pdfReport: '分析报告.pdf',
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(3);
    expect(issues.some((i) => i.message.includes('.xlsx'))).toBe(true);
    expect(issues.some((i) => i.message.includes('.docx'))).toBe(true);
    expect(issues.some((i) => i.message.includes('.pdf'))).toBe(true);
  });

  it('普通翻译不应误报', () => {
    const content = JSON.stringify({
      common: {
        pleaseSelect: '请选择',
        confirm: '确认',
        cancel: '取消',
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(0);
  });

  it('空文件应返回空数组', () => {
    writeFileSync(testFilePath, '', 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(0);
  });

  it('无效 JSON 应返回空数组', () => {
    writeFileSync(testFilePath, '{invalid json}', 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(0);
  });

  it('文件不存在应返回空数组', () => {
    const nonExistentPath = join(testDir, 'non-existent.json');

    const issues = checker.check(nonExistentPath);
    expect(issues.length).toBe(0);
  });

  it('应该检测所有支持的文件扩展名', () => {
    const content = JSON.stringify({
      files: {
        excel1: 'template.xlsx',
        excel2: 'data.xls',
        pdf: 'report.pdf',
        csv: 'export.csv',
        zip: 'archive.zip',
        word1: 'document.doc',
        word2: 'report.docx',
        ppt1: 'slides.ppt',
        ppt2: 'presentation.pptx',
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(9);
  });

  it('应该检测嵌套对象中的文件扩展名', () => {
    const content = JSON.stringify({
      dataCollection: {
        templates: {
          web: {
            excel: '网页采集.xlsx',
          },
          file: {
            pdf: '文件采集.pdf',
          },
        },
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(2);
    expect(issues[0].context).toContain('dataCollection.templates.web.excel');
    expect(issues[1].context).toContain('dataCollection.templates.file.pdf');
  });

  it('应该忽略大小写（文件扩展名检测）', () => {
    const content = JSON.stringify({
      files: {
        upperCase: 'FILE.PDF',
        lowerCase: 'file.pdf',
        mixedCase: 'File.PdF',
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(3);
  });

  it('中间包含扩展名的文本不应误报（只检测结尾）', () => {
    const content = JSON.stringify({
      messages: {
        info: '请上传 .xlsx 或 .pdf 格式的文件',
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(0);
  });

  it('URL 中的扩展名不应误报', () => {
    const content = JSON.stringify({
      download: {
        downloadUrl: 'https://example.com/file.pdf',
        helpLink: 'http://docs.example.com/guide.pdf',
      },
    });
    writeFileSync(testFilePath, content, 'utf-8');

    const issues = checker.check(testFilePath);
    expect(issues.length).toBe(0);
  });
});
