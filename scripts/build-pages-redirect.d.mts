export function redirectTarget(pathname: string, search: string, hash: string, target: string, base: string): string;
export interface MovableKeyRules {
  exact: string[];
  prefixes: string[];
  ignore: string[];
}
export const MOVABLE_KEYS: MovableKeyRules;
export function isMovableKey(key: string, rules: MovableKeyRules): boolean;
export function buildRedirectHtml(options: { target: string; base: string }): string;
export function buildKillSwitchSw(): string;
