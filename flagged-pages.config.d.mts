import type { AstroIntegration } from 'astro';

export const GALLERY_ROUTES: ReadonlyArray<readonly [pattern: string, entrypoint: string]>;
export function galleryEnabled(env: Record<string, string | undefined>): boolean;
export function flaggedPages(options: { gallery: boolean }): AstroIntegration;
