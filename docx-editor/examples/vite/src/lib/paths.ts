/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * Deployment-base helpers.
 *
 * Vite's `base` is `/` for a custom domain / self-hosted dev and
 * `/FreeDocument/` on a GitHub Pages *project* site. Everything else in the
 * app is written as if it sat at the origin root, so this module is the one
 * place that knows about the prefix.
 */

/** Vite's `base`, minus the trailing slash ('' or '/FreeDocument'). */
export const BASE = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/').replace(
  /\/$/,
  ''
);

/** Pure: drop the deployment base so `/FreeDocument/home` reads as `/home`. */
export function stripBase(pathname: string): string {
  if (!BASE) return pathname;
  if (pathname === BASE) return '/';
  return pathname.startsWith(`${BASE}/`) ? pathname.slice(BASE.length) : pathname;
}

/**
 * Resolve an origin-root asset path (e.g. `/logo.svg`, served from `public/`)
 * against the deployment base. Relative and absolute URLs pass through.
 */
export function assetUrl(path: string): string {
  return path.startsWith('/') ? `${BASE}${path}` : path;
}
