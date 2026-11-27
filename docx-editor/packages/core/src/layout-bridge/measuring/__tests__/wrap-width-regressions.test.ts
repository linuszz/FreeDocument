/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * Two measurement regressions that both showed up as "the paragraph wraps far
 * too early" on Chinese contracts (template-613):
 *
 * 1. A trailing run of spaces must hang past the margin instead of starting a
 *    new line. Contract fill-in blanks are exactly that shape
 *    ("出租方(以下简称甲方)：" + underlined spaces).
 * 2. An empty `fontFamily` must fall back to the default family. Building a
 *    canvas font string from `''` produces `"14px "`, which is invalid — the
 *    browser silently keeps the PREVIOUS font, so a 10.5pt body run was
 *    measured with the 18pt title's metrics (24.5px/char instead of 14.5px)
 *    and every line wrapped at ~60% of the column.
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { measureParagraph } from '../measureParagraph';
import { buildFontString, resetCanvasContext } from '../measureContainer';
import type { ParagraphBlock } from '../../../layout-engine/types';

/** `measureContainer.ts` keeps this private; mirrored here for the assertion. */
const DEFAULT_FONT_FAMILY = 'Calibri';

beforeAll(() => {
  GlobalRegistrator.register();
  const fakeCtx = {
    font: '',
    measureText: (s: string) => ({
      width: s.length * 8,
      actualBoundingBoxAscent: 12,
      actualBoundingBoxDescent: 4,
    }),
  };
  // @ts-expect-error — deterministic metrics for the wrap assertions.
  HTMLCanvasElement.prototype.getContext = () => fakeCtx;
  resetCanvasContext();
});

afterAll(() => {
  resetCanvasContext();
  GlobalRegistrator.unregister();
});

function paragraph(text: string, fontFamily?: string): ParagraphBlock {
  return {
    kind: 'paragraph',
    id: 0,
    runs: [{ kind: 'text', text, pmStart: 1, pmEnd: 1 + text.length, fontFamily }],
    attrs: { defaultFontSize: 12, defaultFontFamily: fontFamily ?? DEFAULT_FONT_FAMILY },
    pmStart: 0,
    pmEnd: text.length + 1,
  } as ParagraphBlock;
}

describe('trailing spaces', () => {
  test('do not start a new line', () => {
    // "abc" + 20 spaces = 184px at 8px/char, against a 100px column.
    const measure = measureParagraph(paragraph('abc' + ' '.repeat(20)), 100);

    expect(measure.lines.length).toBe(1);
    expect(measure.totalHeight).toBe(measure.lines[0].lineHeight);
  });

  test('a paragraph of only spaces keeps its single line', () => {
    const measure = measureParagraph(paragraph(' '.repeat(30)), 100);

    expect(measure.lines.length).toBe(1);
  });
});

describe('line grid', () => {
  test('w:docGrid linePitch sets the base of auto line spacing', () => {
    const block = paragraph('文本');
    block.attrs = {
      ...block.attrs,
      spacing: { line: 400 / 240, lineUnit: 'multiplier', lineRule: 'auto' },
      docGridLinePitch: 312,
    };

    const measure = measureParagraph(block, 600);

    // 312 twips = 20.8px base; w:line=400 is 400/240 → 34.67px = 26pt, which is
    // exactly what Word/WPS render for template-395.docx (PDF line pitch 26.0pt).
    expect(Math.round(measure.lines[0].lineHeight * 100) / 100).toBe(34.67);
  });

  test('without a grid the font metric is used', () => {
    const block = paragraph('文本');
    block.attrs = {
      ...block.attrs,
      spacing: { line: 400 / 240, lineUnit: 'multiplier', lineRule: 'auto' },
    };

    const measure = measureParagraph(block, 600);

    expect(measure.lines[0].lineHeight).toBeLessThan(34);
  });
});

describe('buildFontString', () => {
  test('an empty family falls back instead of producing an invalid font', () => {
    const font = buildFontString({ fontFamily: '', fontSize: 10.5 });

    expect(font).not.toMatch(/\s$/); // "14px " would be invalid and ignored
    expect(font).toContain('px');
    expect(font.toLowerCase()).toContain(DEFAULT_FONT_FAMILY.toLowerCase());
  });

  test('an explicit family is kept', () => {
    const font = buildFontString({ fontFamily: 'SimSun', fontSize: 10.5 });

    expect(font.toLowerCase()).toContain('simsun');
  });
});
