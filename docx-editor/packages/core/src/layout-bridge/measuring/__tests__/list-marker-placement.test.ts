/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * Where a list marker goes: beside the text (Word's default `w:suff="tab"`,
 * advanced by a tab) or on its own row when it cannot fit.
 *
 * The decision is made once in measurement (`listMarkerOwnLine`) so the
 * paginator and the painter cannot disagree. They used to: the painter always
 * wrapped a marker with no hanging-indent slot onto its own row while the
 * paginator charged only the text lines, so every following paragraph was
 * painted on top of it (the CJK "第X条" heading overlap on template-618).
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { measureParagraph } from '../measureParagraph';
import { resetCanvasContext } from '../measureContainer';
import type { ParagraphBlock, ParagraphMeasure } from '../../../layout-engine/types';

beforeAll(() => {
  GlobalRegistrator.register();
  // Deterministic metrics: 8px per character, so the fit/no-fit boundary is
  // exact and independent of any real font.
  const fakeCtx = {
    font: '',
    measureText: (s: string) => ({
      width: s.length * 8,
      actualBoundingBoxAscent: 12,
      actualBoundingBoxDescent: 4,
    }),
  };
  // @ts-expect-error — override canvas for measurement determinism in tests.
  HTMLCanvasElement.prototype.getContext = () => fakeCtx;
  resetCanvasContext();
});

afterAll(() => {
  // measureContainer caches the context at module scope; unregistering
  // happy-dom alone would leak the fake mock into the next test file.
  resetCanvasContext();
  GlobalRegistrator.unregister();
});

function listHeading(
  marker: string,
  text: string,
  indent?: { left?: number; hanging?: number; firstLine?: number }
): ParagraphBlock {
  return {
    kind: 'paragraph',
    id: 0,
    runs: [{ kind: 'text', text, pmStart: 1, pmEnd: 1 + text.length }],
    attrs: {
      listMarker: marker,
      indent,
      defaultFontSize: 12,
      defaultFontFamily: 'SimSun',
    },
    pmStart: 0,
    pmEnd: text.length + 1,
  } as ParagraphBlock;
}

function oneLineHeight(measure: ParagraphMeasure): number {
  return measure.lines[0].lineHeight;
}

describe('list marker placement', () => {
  test('a short marker shares the first line with the text', () => {
    const measure = measureParagraph(
      listHeading('第1条', '标的物信息、租金支付', { firstLine: 32 }),
      600
    );

    expect(measure.lines.length).toBe(1);
    expect(measure.listMarkerOwnLine ?? false).toBe(false);
    expect(measure.totalHeight).toBe(oneLineHeight(measure));
  });

  test('a marker wider than the line gets its own row', () => {
    const measure = measureParagraph(listHeading('VERYLONGMARKER'.repeat(10), 'x'), 200);

    expect(measure.listMarkerOwnLine).toBe(true);
    expect(measure.totalHeight).toBe(oneLineHeight(measure) * (measure.lines.length + 1));
  });

  test('a marker inside a hanging indent never takes its own row', () => {
    const measure = measureParagraph(listHeading('1.', 'text', { left: 48, hanging: 48 }), 200);

    expect(measure.listMarkerOwnLine ?? false).toBe(false);
  });
});
