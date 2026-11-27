/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * `word/settings.xml` — the document-wide settings this editor needs.
 *
 * Only the tab grid is read today: `w:defaultTabStop` sets the interval of the
 * implicit tab stops Word lays between explicit ones (ECMA-376 §17.15.1.24).
 * Without it the layout falls back to the 720-twip default, which puts a tab
 * suffix noticeably further right than Word in documents that override it
 * (Chinese contract templates commonly use 420).
 */

import type { DocumentSettings } from '../types/document';

export type { DocumentSettings };

/** Word's own default (0.5 inch) when `w:defaultTabStop` is absent. */
export const DEFAULT_TAB_STOP_TWIPS = 720;

export function parseSettings(xml: string | null | undefined): DocumentSettings {
  if (!xml) return {};

  const match = /<w:defaultTabStop\b[^>]*\bw:val=["'](\d+)["']/.exec(xml);
  if (!match) return {};

  const twips = Number(match[1]);
  if (!Number.isFinite(twips) || twips <= 0) return {};

  return { defaultTabStop: twips };
}

/** The document's tab-stop interval in twips, falling back to Word's default. */
export function resolveDefaultTabStop(settings: DocumentSettings | undefined): number {
  return settings?.defaultTabStop ?? DEFAULT_TAB_STOP_TWIPS;
}

/**
 * `w:docGrid/@w:linePitch` of the body section, in twips.
 *
 * In a document with a line grid (`w:docGrid type="lines"`), Word uses the grid
 * pitch as the base for `lineRule="auto"` spacing: `w:line="400"` on a 312-twip
 * grid renders at 1.667 × 15.6pt = 26.0pt, whatever the font's own metrics say.
 * That is the value the Word/WPS PDF of `template-395.docx` shows (26.0pt line
 * pitch for 10.5pt SimSun), while font-metric-only layout came out 23% shorter
 * and paginated the table at the wrong row.
 *
 * Only the body section's grid is read (single-section documents are the norm);
 * per-section grids are a follow-up.
 */
export function parseDocGridLinePitch(documentXml: string | null | undefined): number | undefined {
  if (!documentXml) return undefined;

  let linePitch: number | undefined;
  const re = /<w:docGrid\b[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(documentXml)) !== null) {
    const tag = match[0];
    if (/\bw:type="(?:lines|linesAndChars|snapToChars|default)"/.test(tag)) {
      const pitch = /\bw:linePitch="(\d+)"/.exec(tag);
      if (pitch) linePitch = Number(pitch[1]);
    }
  }

  return linePitch && Number.isFinite(linePitch) && linePitch > 0 ? linePitch : undefined;
}
