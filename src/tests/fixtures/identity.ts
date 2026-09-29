/**
 * What the privacy gate (src/tests/privacy.test.ts, ADR 0015) refuses to find
 * in anything the site serves: the owner's name, GitHub account or personal
 * domain.
 */
export const IDENTITY_PATTERN = /artemio|padilla|artemiop\.com|github\.com\/artemiopadilla/i;
