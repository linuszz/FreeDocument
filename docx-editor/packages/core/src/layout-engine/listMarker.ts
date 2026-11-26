/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * List-marker placement, decided once and shared by the measurer, the
 * paginator and the painter.
 *
 * Word renders a numbered/bulleted paragraph as: the marker at the hanging
 * indent slot, then a tab (the default `w:suff="tab"`), then the text. When no
 * hanging slot is reserved the marker still shares the first line — it only
 * drops onto its own row when it cannot fit at all.
 *
 * Both the vertical layout (a wrapped marker costs an extra line) and the
 * horizontal paint (the tab advance after the marker) hang off this decision,
 * so it lives in one place rather than being re-derived per renderer.
 */

/**
 * Does the marker have to be pushed onto its own line?
 *
 * @param markerX       Marker start, px from the paragraph's content-left edge.
 * @param markerWidth   Measured marker width in px.
 * @param availableWidth First-line width available to the paragraph (content
 *                       width minus left/right indent), in px.
 */
export function markerNeedsOwnLine(
  markerX: number,
  markerWidth: number,
  availableWidth: number
): boolean {
  return markerX + markerWidth > availableWidth;
}
