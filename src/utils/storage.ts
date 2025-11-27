/**
 * Safe localStorage Utilities
 *
 * Wraps localStorage operations with try-catch to prevent crashes from:
 * - Corrupt JSON data
 * - Storage quota exceeded
 * - localStorage disabled
 * - Parsing errors
 */

/**
 * Safely get an item from localStorage and parse it as JSON
 * @param key - localStorage key
 * @param fallback - Value to return if item doesn't exist or parsing fails
 * @returns Parsed value or fallback
 */
export function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return fallback;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage (key: ${key}):`, error);
    return fallback;
  }
}

/**
 * Safely set an item in localStorage as JSON
 * @param key - localStorage key
 * @param value - Value to store (will be JSON.stringified)
 * @returns true if successful, false otherwise
 */
export function safeSetItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (key: ${key}):`, error);
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Consider clearing old data.');
    }
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 * @param key - localStorage key
 * @returns true if successful, false otherwise
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error);
    return false;
  }
}

/**
 * Safely clear all localStorage
 * @returns true if successful, false otherwise
 */
export function safeClear(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Check if localStorage is available
 * @returns true if localStorage is available and working
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('localStorage is not available:', error);
    return false;
  }
}

/**
 * Get localStorage usage statistics
 * @returns Object with used and available space estimates
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  try {
    // Estimate used space
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Most browsers have 5-10MB limit, we'll use 5MB as conservative estimate
    const available = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = (used / available) * 100;

    return {
      used,
      available,
      percentage: Math.round(percentage * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
}

/**
 * Atomic update - read, modify, write in one operation
 * Useful for updating specific fields in an object
 * @param key - localStorage key
 * @param updater - Function that takes current value and returns new value
 * @param fallback - Fallback value if key doesn't exist
 * @returns true if successful, false otherwise
 */
export function safeUpdate<T>(
  key: string,
  updater: (current: T) => T,
  fallback: T
): boolean {
  try {
    const current = safeGetItem(key, fallback);
    const updated = updater(current);
    return safeSetItem(key, updated);
  } catch (error) {
    console.error(`Error updating localStorage (key: ${key}):`, error);
    return false;
  }
}
