/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

import { describe, test, expect } from 'bun:test';
import {
  resolveTableWidthPx,
  resolveTableOuterWidthPx,
  normalizeTableColumnWidths,
} from '../tableWidthUtils';

describe('resolveTableOuterWidthPx', () => {
  // template-395: w:tblW = 4998 pct over a 553.7px column with 7px cell
  // margins. Word's PDF puts the table rules 5.4pt outside the column on each
  // side (84.4..510.8pt inside 90..505.3pt), i.e. the percentage covers the
  // cell content and the outer margins are added on top.
  test('pct: adds the two outer cell margins', () => {
    const outer = resolveTableOuterWidthPx(4998, 'pct', 553.73, 7, 7);
    expect(outer).toBeCloseTo(553.73 * (4998 / 5000) + 14, 2);
    // 425.9pt, matching the document's w:tblGrid (8519 twips) and the PDF.
    expect(outer! / (96 / 72)).toBeCloseTo(426, 0);
  });

  test('dxa is already the outer width', () => {
    expect(resolveTableOuterWidthPx(1440, 'dxa', 600, 7, 7)).toBeCloseTo(96, 1);
  });

  test('undefined width stays undefined', () => {
    expect(resolveTableOuterWidthPx(undefined, 'pct', 600, 7, 7)).toBeUndefined();
  });
});

describe('resolveTableWidthPx', () => {
  test('dxa: twips converted to pixels', () => {
    // 1440 twips = 1 inch = 96 px
    expect(resolveTableWidthPx(1440, 'dxa', 600)).toBeCloseTo(96, 1);
  });

  test('pct: 50ths of a percent (5000 = 100%) per ECMA-376 §17.18.111', () => {
    expect(resolveTableWidthPx(2500, 'pct', 600)).toBe(300);
    expect(resolveTableWidthPx(5000, 'pct', 600)).toBe(600);
    // Small spec values must NOT be coerced to plain percent — `1` means 0.02%.
    expect(resolveTableWidthPx(1, 'pct', 5000)).toBeCloseTo(1, 5);
  });

  test('zero / negative / undefined width returns undefined', () => {
    expect(resolveTableWidthPx(0, 'dxa', 600)).toBeUndefined();
    expect(resolveTableWidthPx(-10, 'dxa', 600)).toBeUndefined();
    expect(resolveTableWidthPx(undefined, 'dxa', 600)).toBeUndefined();
  });

  test('unrecognized widthType returns undefined', () => {
    expect(resolveTableWidthPx(1440, 'nil', 600)).toBeUndefined();
  });
});

describe('normalizeTableColumnWidths', () => {
  test('empty array returns evenly-split target width', () => {
    expect(normalizeTableColumnWidths([], 3, 300)).toEqual([100, 100, 100]);
  });

  test('missing trailing columns inherit average of existing positives', () => {
    expect(normalizeTableColumnWidths([100, 200], 4, 1000)).toEqual([100, 200, 150, 150]);
  });

  test('zero/negative widths split the leftover target evenly', () => {
    const out = normalizeTableColumnWidths([100, 0, 100, -5], 4, 400);
    expect(out[0]).toBe(100);
    expect(out[2]).toBe(100);
    expect(out[1]).toBeCloseTo(100, 5);
    expect(out[3]).toBeCloseTo(100, 5);
  });

  test('all zero returns even split of target', () => {
    expect(normalizeTableColumnWidths([0, 0, 0], 3, 300)).toEqual([100, 100, 100]);
  });
});
