import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth';

/**
 * Firebase Service
 * Handles Firebase initialization and authentication
 */

// Firebase configuration
// In production, these should come from environment variables
const firebaseConfig: FirebaseOptions = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Initialize Firebase
 */
export function initializeFirebase(): FirebaseApp {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }
  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth!;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const authInstance = getFirebaseAuth();
  return signInWithEmailAndPassword(authInstance, email, password);
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> {
  const authInstance = getFirebaseAuth();
  const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);

  // Update display name if provided
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }

  return userCredential;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const authInstance = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(authInstance, provider);
}

/**
 * Sign in with GitHub
 */
export async function signInWithGitHub(): Promise<UserCredential> {
  const authInstance = getFirebaseAuth();
  const provider = new GithubAuthProvider();
  // Request repo scope for recipe contributions
  provider.addScope('public_repo');
  return signInWithPopup(authInstance, provider);
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  const authInstance = getFirebaseAuth();
  return signOut(authInstance);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const authInstance = getFirebaseAuth();
  return sendPasswordResetEmail(authInstance, email);
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  const authInstance = getFirebaseAuth();
  return onAuthStateChanged(authInstance, callback);
}

/**
 * Get current user
 */
export function getCurrentUser(): FirebaseUser | null {
  const authInstance = getFirebaseAuth();
  return authInstance.currentUser;
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> {
  const authInstance = getFirebaseAuth();
  const user = authInstance.currentUser;
  if (!user) {
    throw new Error('No user signed in');
  }
  return updateProfile(user, updates);
}

/**
 * Check if user is signed in
 */
export function isUserSignedIn(): boolean {
  const user = getCurrentUser();
  return user !== null;
}

/**
 * Get user ID token (for API calls)
 */
export async function getUserIdToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }
  return user.getIdToken();
}

export default {
  initializeFirebase,
  getFirebaseAuth,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithGitHub,
  signOutUser,
  sendPasswordReset,
  onAuthStateChange,
  getCurrentUser,
  updateUserProfile,
  isUserSignedIn,
  getUserIdToken,
};
