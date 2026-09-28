import type { AuthUser } from '@/schemas/auth';

/**
 * Avatar initials for a user: first letters of the first two words of the
 * display name (or of the e-mail's local part), upper-cased; `?` when neither
 * exists. Shared by the header's AccountMenu/AccountDropdown and Profile.
 */
export function initials(user: Pick<AuthUser, 'displayName' | 'email'>): string {
  const source = user.displayName?.trim() || user.email?.split('@')[0] || '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : source.slice(0, 2);
  return letters.toUpperCase() || '?';
}
