/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * `w:defaultTabStop` — the interval of Word's implicit tab stops (§17.15.1.24).
 *
 * Documents that override it (Chinese contract templates commonly use 420
 * instead of the 720 default) had their tabs laid out on the wrong grid, which
 * put a list marker's tab suffix noticeably further right than Word.
 *
 * This pins the plumbing: settings.xml → Document.settings → PM doc attrs →
 * paragraph attrs (where the painter reads it).
 */

import { describe, expect, test } from 'bun:test';
import {
  parseSettings,
  parseDocGridLinePitch,
  resolveDefaultTabStop,
  DEFAULT_TAB_STOP_TWIPS,
} from '../settingsParser';
import { toProseDoc } from '../../prosemirror/conversion/toProseDoc';
import { toFlowBlocks } from '../../layout-bridge/toFlowBlocks';
import type { Document, Paragraph } from '../../types/document';

const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="420"/>
</w:settings>`;

function docWith(settings?: { defaultTabStop?: number }): Document {
  const paragraph: Paragraph = {
    type: 'paragraph',
    content: [{ type: 'run', content: [{ type: 'text', text: '正文' }] }],
  };
  return {
    package: { document: { content: [paragraph] } },
    ...(settings ? { settings } : {}),
  } as unknown as Document;
}

describe('parseSettings', () => {
  test('reads w:defaultTabStop', () => {
    expect(parseSettings(SETTINGS)).toEqual({ defaultTabStop: 420 });
  });

  test('returns nothing when the element is absent', () => {
    expect(parseSettings('<w:settings/>')).toEqual({});
    expect(parseSettings(null)).toEqual({});
  });

  test('ignores a non-positive value', () => {
    expect(parseSettings('<w:settings><w:defaultTabStop w:val="0"/></w:settings>')).toEqual({});
  });

  test('falls back to the 720-twip default when unset', () => {
    expect(resolveDefaultTabStop(undefined)).toBe(DEFAULT_TAB_STOP_TWIPS);
    expect(resolveDefaultTabStop({})).toBe(DEFAULT_TAB_STOP_TWIPS);
    expect(resolveDefaultTabStop({ defaultTabStop: 420 })).toBe(420);
  });
});

describe('parseDocGridLinePitch', () => {
  test('reads the body section line pitch', () => {
    const doc =
      '<w:sectPr><w:docGrid w:type="lines" w:linePitch="312" w:charSpace="0"/></w:sectPr>';
    expect(parseDocGridLinePitch(doc)).toBe(312);
  });

  test('uses the last grid when several sections declare one', () => {
    const doc =
      '<w:docGrid w:type="lines" w:linePitch="200"/>' +
      '<w:docGrid w:type="lines" w:linePitch="312"/>';
    expect(parseDocGridLinePitch(doc)).toBe(312);
  });

  test('ignores a grid that is not a line grid', () => {
    expect(parseDocGridLinePitch('<w:docGrid w:type="none" w:linePitch="312"/>')).toBeUndefined();
    expect(parseDocGridLinePitch('<w:docGrid/>')).toBeUndefined();
    expect(parseDocGridLinePitch(null)).toBeUndefined();
  });
});

describe('defaultTabStop plumbing', () => {
  test('rides on the PM doc and lands on every paragraph block', () => {
    const pmDoc = toProseDoc(docWith({ defaultTabStop: 420 }));
    expect(pmDoc.attrs.defaultTabStop).toBe(420);

    const blocks = toFlowBlocks(pmDoc);
    const paragraph = blocks.find((b) => b.kind === 'paragraph');
    expect(
      paragraph && paragraph.kind === 'paragraph' ? paragraph.attrs?.defaultTabStop : null
    ).toBe(420);
  });

  test('is absent when the document does not set it', () => {
    const blocks = toFlowBlocks(toProseDoc(docWith()));
    const paragraph = blocks.find((b) => b.kind === 'paragraph');
    expect(
      paragraph && paragraph.kind === 'paragraph' ? paragraph.attrs?.defaultTabStop : undefined
    ).toBeUndefined();
  });
});
