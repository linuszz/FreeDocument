/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * Word never treats CR / LF / TAB inside `<w:t>` as a line break — only
 * `<w:br/>` does. Documents written by external tooling (AI edit pipelines,
 * generators) do put raw newlines in there. The painter renders with
 * `white-space: pre`, so an un-normalised newline drew a line that layout had
 * never measured, landing on top of the following line.
 *
 * Fixture for the visual half: `template-395.docx` (a tracked insertion whose
 * text contains a newline).
 */

import { describe, expect, test } from 'bun:test';
import { toProseDoc } from '../../prosemirror/conversion/toProseDoc';
import { toFlowBlocks } from '../toFlowBlocks';
import type { Document, Paragraph } from '../../types/document';

function docWithText(text: string): Document {
  const paragraph: Paragraph = {
    type: 'paragraph',
    content: [{ type: 'run', content: [{ type: 'text', text }] }],
  };
  return { package: { document: { content: [paragraph] } } } as unknown as Document;
}

function firstRunText(doc: Document): string {
  const blocks = toFlowBlocks(toProseDoc(doc));
  const paragraph = blocks.find((b) => b.kind === 'paragraph');
  if (!paragraph || paragraph.kind !== 'paragraph') throw new Error('no paragraph block');
  const run = paragraph.runs[0];
  if (!run || run.kind !== 'text') throw new Error('no text run');
  return run.text;
}

describe('layout whitespace normalisation', () => {
  test('a newline inside w:t becomes a space, not a line break', () => {
    const text = firstRunText(docWithText('乙方负责在签订合同\n智制化开发'));

    expect(text).toBe('乙方负责在签订合同 智制化开发');
    expect(text).not.toContain('\n');
  });

  test('CRLF and tabs are normalised 1:1 so PM offsets stay valid', () => {
    const source = 'a\r\nb\tc';
    const text = firstRunText(docWithText(source));

    expect(text).toBe('a  b c'); // \r and \n each become one space
    expect(text.length).toBe(source.length);
  });

  test('ordinary text is left untouched', () => {
    expect(firstRunText(docWithText('普通文本，无需改动。'))).toBe('普通文本，无需改动。');
  });
});
