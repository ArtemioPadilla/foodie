import { User as FirebaseUser, UserCredential } from 'firebase/auth';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithGitHub,
  signOutUser,
  sendPasswordReset,
  getCurrentUser,
  updateUserProfile,
} from './firebaseService';
import { User, UserPreferences } from '@/types';

/**
 * Authentication Service
 * Higher-level authentication operations and user management
 */

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Convert Firebase User to App User
 */
function convertFirebaseUser(firebaseUser: FirebaseUser): User {
  // Get preferences from localStorage or use defaults
  const storedPrefs = localStorage.getItem(`user-preferences-${firebaseUser.uid}`);
  const preferences: UserPreferences = storedPrefs
    ? JSON.parse(storedPrefs)
    : {
        language: 'en',
        theme: 'light',
        defaultServings: 4,
        dietaryRestrictions: [],
        allergies: [],
        excludedIngredients: [],
      };

  // Get favorites from localStorage
  const storedFavorites = localStorage.getItem(`user-favorites-${firebaseUser.uid}`);
  const favoriteRecipes: string[] = storedFavorites ? JSON.parse(storedFavorites) : [];

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || 'User',
    photoURL: firebaseUser.photoURL || undefined,
    preferences,
    favoriteRecipes,
    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
  };
}

/**
 * Sign in with email and password
 */
export async function signIn(credentials: SignInCredentials): Promise<AuthResult> {
  try {
    const userCredential = await signInWithEmail(credentials.email, credentials.password);
    const user = convertFirebaseUser(userCredential.user);

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Sign in error:', error);

    let errorMessage = 'Failed to sign in. Please try again.';

    if (error?.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email.';
    } else if (error?.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (error?.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (error?.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled.';
    } else if (error?.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(data: SignUpData): Promise<AuthResult> {
  try {
    const userCredential = await signUpWithEmail(
      data.email,
      data.password,
      data.displayName
    );
    const user = convertFirebaseUser(userCredential.user);

    // Initialize user preferences in localStorage
    localStorage.setItem(
      `user-preferences-${user.id}`,
      JSON.stringify(user.preferences)
    );
    localStorage.setItem(`user-favorites-${user.id}`, JSON.stringify([]));

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Sign up error:', error);

    let errorMessage = 'Failed to create account. Please try again.';

    if (error?.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email already exists.';
    } else if (error?.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (error?.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Use at least 6 characters.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sign in with Google
 */
export async function signInGoogle(): Promise<AuthResult> {
  try {
    const userCredential = await signInWithGoogle();
    const user = convertFirebaseUser(userCredential.user);

    // Initialize preferences if new user
    if (!localStorage.getItem(`user-preferences-${user.id}`)) {
      localStorage.setItem(
        `user-preferences-${user.id}`,
        JSON.stringify(user.preferences)
      );
      localStorage.setItem(`user-favorites-${user.id}`, JSON.stringify([]));
    }

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Google sign in error:', error);

    let errorMessage = 'Failed to sign in with Google.';

    if (error?.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign in cancelled.';
    } else if (error?.code === 'auth/popup-blocked') {
      errorMessage = 'Popup blocked. Please allow popups for this site.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sign in with GitHub
 */
export async function signInGitHub(): Promise<AuthResult> {
  try {
    const userCredential = await signInWithGitHub();
    const user = convertFirebaseUser(userCredential.user);

    // Initialize preferences if new user
    if (!localStorage.getItem(`user-preferences-${user.id}`)) {
      localStorage.setItem(
        `user-preferences-${user.id}`,
        JSON.stringify(user.preferences)
      );
      localStorage.setItem(`user-favorites-${user.id}`, JSON.stringify([]));
    }

    // Store GitHub access token for recipe contributions
    const credential = userCredential as UserCredential & {
      _tokenResponse?: { oauthAccessToken?: string };
    };
    if (credential._tokenResponse?.oauthAccessToken) {
      localStorage.setItem('github-access-token', credential._tokenResponse.oauthAccessToken);
    }

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('GitHub sign in error:', error);

    let errorMessage = 'Failed to sign in with GitHub.';

    if (error?.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign in cancelled.';
    } else if (error?.code === 'auth/popup-blocked') {
      errorMessage = 'Popup blocked. Please allow popups for this site.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await signOutUser();
  // Clear GitHub token
  localStorage.removeItem('github-access-token');
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    await sendPasswordReset(email);
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Password reset error:', error);

    let errorMessage = 'Failed to send password reset email.';

    if (error?.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email.';
    } else if (error?.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  const storedPrefs = localStorage.getItem(`user-preferences-${userId}`);
  const currentPrefs: UserPreferences = storedPrefs
    ? JSON.parse(storedPrefs)
    : {
        language: 'en',
        theme: 'light',
        defaultServings: 4,
        dietaryRestrictions: [],
        allergies: [],
        excludedIngredients: [],
      };

  const updatedPrefs = { ...currentPrefs, ...preferences };
  localStorage.setItem(`user-preferences-${userId}`, JSON.stringify(updatedPrefs));
}

/**
 * Get user preferences
 */
export function getUserPreferences(userId: string): UserPreferences {
  const storedPrefs = localStorage.getItem(`user-preferences-${userId}`);
  return storedPrefs
    ? JSON.parse(storedPrefs)
    : {
        language: 'en',
        theme: 'light',
        defaultServings: 4,
        dietaryRestrictions: [],
        allergies: [],
        excludedIngredients: [],
      };
}

/**
 * Add recipe to favorites
 */
export function addFavorite(userId: string, recipeId: string): void {
  const storedFavorites = localStorage.getItem(`user-favorites-${userId}`);
  const favorites: string[] = storedFavorites ? JSON.parse(storedFavorites) : [];

  if (!favorites.includes(recipeId)) {
    favorites.push(recipeId);
    localStorage.setItem(`user-favorites-${userId}`, JSON.stringify(favorites));
  }
}

/**
 * Remove recipe from favorites
 */
export function removeFavorite(userId: string, recipeId: string): void {
  const storedFavorites = localStorage.getItem(`user-favorites-${userId}`);
  const favorites: string[] = storedFavorites ? JSON.parse(storedFavorites) : [];

  const updated = favorites.filter((id) => id !== recipeId);
  localStorage.setItem(`user-favorites-${userId}`, JSON.stringify(updated));
}

/**
 * Get user favorites
 */
export function getUserFavorites(userId: string): string[] {
  const storedFavorites = localStorage.getItem(`user-favorites-${userId}`);
  return storedFavorites ? JSON.parse(storedFavorites) : [];
}

/**
 * Check if recipe is favorited
 */
export function isFavorite(userId: string, recipeId: string): boolean {
  const favorites = getUserFavorites(userId);
  return favorites.includes(recipeId);
}

/**
 * Get current signed-in user
 */
export function getSignedInUser(): User | null {
  const firebaseUser = getCurrentUser();
  if (!firebaseUser) {
    return null;
  }
  return convertFirebaseUser(firebaseUser);
}

/**
 * Update user display name
 */
export async function updateDisplayName(displayName: string): Promise<void> {
  await updateUserProfile({ displayName });
}

/**
 * Update user photo URL
 */
export async function updatePhotoURL(photoURL: string): Promise<void> {
  await updateUserProfile({ photoURL });
}

export default {
  signIn,
  signUp,
  signInGoogle,
  signInGitHub,
  signOut,
  resetPassword,
  updatePreferences,
  getUserPreferences,
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorite,
  getSignedInUser,
  updateDisplayName,
  updatePhotoURL,
};
