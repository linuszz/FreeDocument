/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * Header/footer geometry for FLOATING (anchored) textboxes.
 *
 * Word sizes a header/footer band from its flow text only; a floating shape
 * paints at its anchor and may overflow. template-613's footer is one empty
 * paragraph with a 2in x 2in transparent text frame anchored at the paragraph
 * top — counting the frame made the footer 144pt tall and pushed the page
 * number ~130pt up the page. Its Word/WPS PDF puts the 9pt line's baseline
 * 790.61pt from the page top, i.e. one line above `footerDistance`.
 */

import { describe, expect, test } from 'bun:test';
import type {
  FlowBlock,
  Measure,
  ParagraphBlock,
  ParagraphMeasure,
  TextBoxBlock,
  TextBoxMeasure,
} from '../../layout-engine/types';
import {
  calculateHeaderFooterFlowHeight,
  calculateHeaderFooterVisualBounds,
  convertHeaderFooterToContent,
  isFloatingHeaderFooterBlock,
  resolveHeaderFooterTextBoxAlignWidth,
  resolveHeaderFooterTextBoxLeft,
  type HeaderFooterMetrics,
} from '../headerFooterLayout';
import type { HeaderFooter } from '../../types/document';
import type { Paragraph, ParagraphContent, Shape } from '../../types/content';

const metrics: HeaderFooterMetrics = {
  section: 'footer',
  pageSize: { w: 794, h: 1123 }, // A4 in CSS px
  margins: { top: 96, bottom: 96, left: 120, right: 120, header: 56, footer: 66 },
};
const contentWidth = metrics.pageSize.w - metrics.margins.left - metrics.margins.right; // 554

function paragraph(totalHeight: number): ParagraphMeasure {
  return {
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 1,
        width: 12,
        ascent: 12,
        descent: 3,
        lineHeight: totalHeight,
      },
    ],
    totalHeight,
  };
}

function textBoxMeasure(width: number, height: number, lineWidth: number): TextBoxMeasure {
  const inner = paragraph(18);
  inner.lines[0].width = lineWidth;
  return { kind: 'textBox', width, height, innerMeasures: [inner] };
}

/** Footer body: one empty 9pt paragraph + a 2in floating text frame. */
function footerBlocks(): { blocks: FlowBlock[]; measures: Measure[] } {
  const para: ParagraphBlock = {
    kind: 'paragraph',
    id: 1 as unknown as ParagraphBlock['id'],
    runs: [],
    attrs: {},
  };
  const frame: TextBoxBlock = {
    kind: 'textBox',
    id: 2 as unknown as TextBoxBlock['id'],
    width: 192,
    height: 192,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    content: [],
    anchor: {
      offsetV: 0,
      relFromV: 'paragraph',
      relFromH: 'margin',
      alignH: 'center',
    },
  };
  return {
    blocks: [para, frame],
    measures: [paragraph(18), textBoxMeasure(192, 192, 90)],
  };
}

describe('floating textboxes are not part of the header/footer band', () => {
  test('isFloatingHeaderFooterBlock only matches anchored textboxes', () => {
    const { blocks } = footerBlocks();
    expect(isFloatingHeaderFooterBlock(blocks[1])).toBe(true);
    expect(isFloatingHeaderFooterBlock(blocks[0])).toBe(false);
  });

  test('flow height ignores the 2in frame', () => {
    const { blocks, measures } = footerBlocks();
    expect(calculateHeaderFooterFlowHeight(blocks, measures)).toBe(18);
  });

  test('visual bounds ignore the 2in frame too', () => {
    const { blocks, measures } = footerBlocks();
    const bounds = calculateHeaderFooterVisualBounds(blocks, measures, 18, metrics);
    expect(bounds).toEqual({ visualTop: 0, visualBottom: 18 });
  });

  test('an inline textbox still contributes its height', () => {
    const frame: TextBoxBlock = {
      kind: 'textBox',
      id: 3 as unknown as TextBoxBlock['id'],
      width: 192,
      height: 40,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      content: [],
    };
    expect(calculateHeaderFooterFlowHeight([frame], [textBoxMeasure(192, 40, 90)])).toBe(40);
  });

  test('convertHeaderFooterToContent reports one-line height for the 613 footer', () => {
    const { blocks, measures } = footerBlocks();
    // Exercise the public entry point with a stubbed measure step: the fixture
    // builder that normally feeds it is Canvas-aware, which unit tests are not.
    const content = convertHeaderFooterToContent(footerDocument(), contentWidth, metrics, {
      measureBlocks: (measured) =>
        measured.length === blocks.length ? measures : measures.slice(0, measured.length),
    });
    expect(content?.height).toBe(18);
    expect(content?.visualBottom).toBe(18);
  });
});

describe('anchored textbox horizontal alignment', () => {
  const frame = () => footerBlocks().blocks[1] as TextBoxBlock;

  test('margin-relative center aligns the box in the content area', () => {
    const left = resolveHeaderFooterTextBoxLeft(frame().anchor!, metrics, contentWidth, 192);
    expect(left).toBe((contentWidth - 192) / 2);
  });

  test('page-relative center aligns the box in the page', () => {
    const anchor = { offsetV: 0, relFromV: 'page', relFromH: 'page', alignH: 'center' };
    expect(resolveHeaderFooterTextBoxLeft(anchor, metrics, contentWidth, 192)).toBe(
      (metrics.pageSize.w - 192) / 2 - metrics.margins.left
    );
  });

  test('an explicit offset (no align) is honoured', () => {
    const anchor = { offsetH: 40, offsetV: 0, relFromH: 'margin' };
    expect(resolveHeaderFooterTextBoxLeft(anchor, metrics, contentWidth, 192)).toBe(40);
  });

  test('right alignment hugs the right edge', () => {
    const anchor = { offsetV: 0, relFromV: 'paragraph', relFromH: 'margin', alignH: 'right' };
    expect(resolveHeaderFooterTextBoxLeft(anchor, metrics, contentWidth, 192)).toBe(
      contentWidth - 192
    );
  });

  test('an invisible frame aligns its text width, a visible one its box', () => {
    const measure = textBoxMeasure(192, 192, 90);
    expect(resolveHeaderFooterTextBoxAlignWidth(frame(), measure)).toBe(90);

    const visible = { ...frame(), fillColor: '#ff0000' };
    expect(resolveHeaderFooterTextBoxAlignWidth(visible, measure)).toBe(192);

    const noAlign = { ...frame(), anchor: { ...frame().anchor!, alignH: undefined } };
    expect(resolveHeaderFooterTextBoxAlignWidth(noAlign, measure)).toBe(192);
  });
});

/** Minimal document model for the convertHeaderFooterToContent smoke test. */
function footerDocument(): HeaderFooter {
  const innerParagraph: Paragraph = {
    type: 'paragraph',
    content: [{ type: 'run', content: [{ type: 'text', text: '第 1 页共 3 页' }] }],
  };
  const shape: Shape = {
    type: 'shape',
    shapeType: 'rect',
    size: { width: 192, height: 192 },
    position: {
      horizontal: { relativeTo: 'margin', alignment: 'center' },
      vertical: { relativeTo: 'paragraph', posOffset: 0 },
    },
    wrap: { type: 'inFront' },
    textBody: { content: [innerParagraph] },
  };
  const anchorParagraph: Paragraph = {
    type: 'paragraph',
    content: [{ type: 'run', content: [{ type: 'shape', shape }] } as ParagraphContent],
  };
  return { type: 'footer', hdrFtrType: 'default', content: [anchorParagraph] };
}
