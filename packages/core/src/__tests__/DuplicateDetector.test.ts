import { describe, it, expect } from 'vitest';
import { DuplicateDetector } from '../scanner/DuplicateDetector';
import type { ScanResult } from '../types';

describe('DuplicateDetector', () => {
  const detector = new DuplicateDetector();

  it('应该检测基本的重复字符串', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'a.vue',
        hardcodedStrings: [
          { text: '请选择', line: 10, column: 5, context: 'template' },
          { text: '请选择', line: 20, column: 8, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 2 });

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].value).toBe('请选择');
    expect(duplicates[0].count).toBe(2);
    expect(duplicates[0].locations).toHaveLength(2);
  });

  it('应该支持跨文件检测', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'a.vue',
        hardcodedStrings: [{ text: '保存', line: 10, column: 5, context: 'template' }],
        untranslatables: [],
        duplicates: [],
      },
      {
        filePath: 'b.vue',
        hardcodedStrings: [{ text: '保存', line: 15, column: 3, context: 'template' }],
        untranslatables: [],
        duplicates: [],
      },
      {
        filePath: 'c.vue',
        hardcodedStrings: [{ text: '保存', line: 8, column: 2, context: 'template' }],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 2, crossFile: true });

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].value).toBe('保存');
    expect(duplicates[0].count).toBe(3);
    expect(duplicates[0].locations).toHaveLength(3);
    expect(duplicates[0].locations[0].filePath).toBe('a.vue');
    expect(duplicates[0].locations[1].filePath).toBe('b.vue');
    expect(duplicates[0].locations[2].filePath).toBe('c.vue');
  });

  it('应该根据阈值过滤重复', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'a.vue',
        hardcodedStrings: [
          { text: '确定', line: 10, column: 5, context: 'template' },
          { text: '取消', line: 11, column: 5, context: 'template' },
          { text: '取消', line: 12, column: 5, context: 'template' },
          { text: '取消', line: 13, column: 5, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 3 });

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].value).toBe('取消');
    expect(duplicates[0].count).toBe(3);
  });

  it('应该忽略短字符串', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'a.vue',
        hardcodedStrings: [
          { text: '是', line: 10, column: 5, context: 'template' },
          { text: '是', line: 11, column: 5, context: 'template' },
          { text: '否', line: 12, column: 5, context: 'template' },
          { text: '否', line: 13, column: 5, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 2, minLength: 2 });

    expect(duplicates).toHaveLength(0); // 单字符被忽略
  });

  it('应该按出现次数降序排序', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'a.vue',
        hardcodedStrings: [
          { text: '保存', line: 10, column: 5, context: 'template' },
          { text: '保存', line: 11, column: 5, context: 'template' },
          { text: '取消', line: 12, column: 5, context: 'template' },
          { text: '取消', line: 13, column: 5, context: 'template' },
          { text: '取消', line: 14, column: 5, context: 'template' },
          { text: '删除', line: 15, column: 5, context: 'template' },
          { text: '删除', line: 16, column: 5, context: 'template' },
          { text: '删除', line: 17, column: 5, context: 'template' },
          { text: '删除', line: 18, column: 5, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 2 });

    expect(duplicates).toHaveLength(3);
    expect(duplicates[0].value).toBe('删除'); // 4 次
    expect(duplicates[0].count).toBe(4);
    expect(duplicates[1].value).toBe('取消'); // 3 次
    expect(duplicates[1].count).toBe(3);
    expect(duplicates[2].value).toBe('保存'); // 2 次
    expect(duplicates[2].count).toBe(2);
  });

  it('应该忽略空字符串和空白字符', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'a.vue',
        hardcodedStrings: [
          { text: '', line: 10, column: 5, context: 'template' },
          { text: '  ', line: 11, column: 5, context: 'template' },
          { text: '\n', line: 12, column: 5, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 1 });

    expect(duplicates).toHaveLength(0);
  });

  it('应该记录正确的位置信息', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'components/Button.vue',
        hardcodedStrings: [
          { text: '提交', line: 25, column: 10, context: 'template' },
          { text: '提交', line: 50, column: 15, context: 'script' },
        ],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 2 });

    expect(duplicates[0].locations[0]).toEqual({
      filePath: 'components/Button.vue',
      line: 25,
    });
    expect(duplicates[0].locations[1]).toEqual({
      filePath: 'components/Button.vue',
      line: 50,
    });
  });

  it('应该处理多个文件的复杂场景', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'a.vue',
        hardcodedStrings: [
          { text: '保存', line: 10, column: 5, context: 'template' },
          { text: '取消', line: 11, column: 5, context: 'template' },
          { text: '删除', line: 12, column: 5, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
      {
        filePath: 'b.vue',
        hardcodedStrings: [
          { text: '保存', line: 20, column: 5, context: 'template' },
          { text: '取消', line: 21, column: 5, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
      {
        filePath: 'c.vue',
        hardcodedStrings: [
          { text: '保存', line: 30, column: 5, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 2 });

    expect(duplicates).toHaveLength(2);
    expect(duplicates[0].value).toBe('保存'); // 3 次
    expect(duplicates[1].value).toBe('取消'); // 2 次
  });

  it('应该生成合理的 key', () => {
    const scanResults: ScanResult[] = [
      {
        filePath: 'a.vue',
        hardcodedStrings: [
          { text: '请选择日期', line: 10, column: 5, context: 'template' },
          { text: '请选择日期', line: 20, column: 5, context: 'template' },
        ],
        untranslatables: [],
        duplicates: [],
      },
    ];

    const duplicates = detector.detect(scanResults, { minOccurrences: 2 });

    expect(duplicates[0].key).toBeTruthy();
    expect(typeof duplicates[0].key).toBe('string');
  });
});
