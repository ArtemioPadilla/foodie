/**
 * Generate a cryptographically secure unique share token for meal plans
 * Uses crypto.randomUUID() which provides 128 bits of entropy
 *
 * @returns A unique UUID token string
 * @throws Error if crypto.randomUUID is not available (unsupported browser)
 */
export function generateShareToken(): string {
  // Check if crypto.randomUUID is available (all modern browsers support this)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // If crypto.randomUUID is not available, use crypto.getRandomValues as secure fallback
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Generate 16 random bytes (128 bits) for UUID v4
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant bits according to RFC 4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    // Convert to UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // No secure random available - this should never happen in modern browsers
  throw new Error('Crypto API not available. Please use a modern browser with crypto.randomUUID support.');
}
