import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { User } from '@/types';
import { initializeFirebase, onAuthStateChange } from '@services/firebaseService';
import * as authService from '@services/authService';

/**
 * Authentication Context
 * Manages authentication state and provides auth operations
 */

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: authService.SignInCredentials) => Promise<authService.AuthResult>;
  signUp: (data: authService.SignUpData) => Promise<authService.AuthResult>;
  signInGoogle: () => Promise<authService.AuthResult>;
  signInGitHub: () => Promise<authService.AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<authService.AuthResult>;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
  addFavorite: (recipeId: string) => void;
  removeFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  updateDisplayName: (displayName: string) => Promise<void>;
  updatePhotoURL: (photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Firebase and subscribe to auth state changes
  useEffect(() => {
    // Initialize Firebase
    try {
      initializeFirebase();
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      setLoading(false);
      return;
    }

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        const appUser = authService.getSignedInUser();
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in
  const signIn = async (credentials: authService.SignInCredentials) => {
    const result = await authService.signIn(credentials);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  // Sign up
  const signUp = async (data: authService.SignUpData) => {
    const result = await authService.signUp(data);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  // Sign in with Google
  const signInGoogle = async () => {
    const result = await authService.signInGoogle();
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  // Sign in with GitHub
  const signInGitHub = async () => {
    const result = await authService.signInGitHub();
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  // Sign out
  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  // Reset password
  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  // Update preferences
  const updatePreferences = async (preferences: Partial<User['preferences']>) => {
    if (!user) {
      throw new Error('No user signed in');
    }
    await authService.updatePreferences(user.id, preferences);
    setUser({
      ...user,
      preferences: { ...user.preferences, ...preferences },
    });
  };

  // Add favorite
  const addFavorite = (recipeId: string) => {
    if (!user) {
      throw new Error('No user signed in');
    }
    authService.addFavorite(user.id, recipeId);
    setUser({
      ...user,
      favoriteRecipes: [...user.favoriteRecipes, recipeId],
    });
  };

  // Remove favorite
  const removeFavorite = (recipeId: string) => {
    if (!user) {
      throw new Error('No user signed in');
    }
    authService.removeFavorite(user.id, recipeId);
    setUser({
      ...user,
      favoriteRecipes: user.favoriteRecipes.filter((id) => id !== recipeId),
    });
  };

  // Check if recipe is favorite
  const isFavorite = (recipeId: string): boolean => {
    if (!user) {
      return false;
    }
    return user.favoriteRecipes.includes(recipeId);
  };

  // Update display name
  const updateDisplayName = async (displayName: string) => {
    if (!user) {
      throw new Error('No user signed in');
    }
    await authService.updateDisplayName(displayName);
    setUser({ ...user, displayName });
  };

  // Update photo URL
  const updatePhotoURL = async (photoURL: string) => {
    if (!user) {
      throw new Error('No user signed in');
    }
    await authService.updatePhotoURL(photoURL);
    setUser({ ...user, photoURL });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signInGoogle,
      signInGitHub,
      signOut,
      resetPassword,
      updatePreferences,
      addFavorite,
      removeFavorite,
      isFavorite,
      updateDisplayName,
      updatePhotoURL,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth Hook
 * Access authentication context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
