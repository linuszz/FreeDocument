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
