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
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { MealPlan } from '@/types';

/**
 * Firebase Service
 * Handles Firebase initialization and authentication
 */

// Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyD6sL_ETINsbrwn3XCy45MBFn4WMyXSzIM",
  authDomain: "foodie-cc553.firebaseapp.com",
  projectId: "foodie-cc553",
  storageBucket: "foodie-cc553.firebasestorage.app",
  messagingSenderId: "815482397968",
  appId: "1:815482397968:web:c5a2c0e54aa86e36dbf195",
  measurementId: "G-079J7Z1226"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * Initialize Firebase
 */
export function initializeFirebase(): FirebaseApp {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      // Firebase initialized successfully
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }
  return app;
}

/**
 * Get Firestore instance
 */
export function getFirestoreDb(): Firestore | null {
  if (!db && app) {
    db = getFirestore(app);
  }
  return db;
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

// ========================================
// Firestore - Shared Meal Plans
// ========================================

const SHARED_PLANS_COLLECTION = 'sharedPlans';

/**
 * Share a meal plan to Firestore
 * @param plan - The meal plan to share
 * @param shareToken - Unique token for accessing the plan
 * @returns Success status
 */
export async function sharePlanToFirebase(plan: MealPlan, shareToken: string): Promise<boolean> {
  try {
    const database = getFirestoreDb();
    if (!database) {
      console.warn('Firebase not initialized. Plan saved locally only.');
      return false;
    }

    const planRef = doc(database, SHARED_PLANS_COLLECTION, shareToken);

    await setDoc(planRef, {
      ...plan,
      sharedAt: serverTimestamp(),
      isPublic: true,
    });

    return true;
  } catch (error) {
    console.error('Error sharing plan to Firebase:', error);
    return false;
  }
}

/**
 * Get a shared meal plan from Firestore
 * @param shareToken - The share token
 * @returns The meal plan or null if not found
 */
export async function getSharedPlanFromFirebase(shareToken: string): Promise<MealPlan | null> {
  try {
    const database = getFirestoreDb();
    if (!database) {
      console.warn('Firebase not initialized. Cannot fetch shared plan.');
      return null;
    }

    const planRef = doc(database, SHARED_PLANS_COLLECTION, shareToken);
    const planSnap = await getDoc(planRef);

    if (planSnap.exists()) {
      const data = planSnap.data();
      // Remove server timestamp before returning
      const { sharedAt, ...planData } = data;
      return planData as MealPlan;
    }

    return null;
  } catch (error) {
    console.error('Error fetching shared plan from Firebase:', error);
    return null;
  }
}

/**
 * Update a shared meal plan in Firestore
 * @param shareToken - The share token
 * @param updates - Partial plan updates
 * @returns Success status
 */
export async function updateSharedPlan(
  shareToken: string,
  updates: Partial<MealPlan>
): Promise<boolean> {
  try {
    const database = getFirestoreDb();
    if (!database) {
      console.warn('Firebase not initialized.');
      return false;
    }

    const planRef = doc(database, SHARED_PLANS_COLLECTION, shareToken);

    await updateDoc(planRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error updating shared plan:', error);
    return false;
  }
}

/**
 * Delete a shared meal plan from Firestore
 * @param shareToken - The share token
 * @returns Success status
 */
export async function deleteSharedPlan(shareToken: string): Promise<boolean> {
  try {
    const database = getFirestoreDb();
    if (!database) {
      console.warn('Firebase not initialized.');
      return false;
    }

    const planRef = doc(database, SHARED_PLANS_COLLECTION, shareToken);
    await deleteDoc(planRef);

    return true;
  } catch (error) {
    console.error('Error deleting shared plan:', error);
    return false;
  }
}

/**
 * Check if a share token exists in Firestore
 * @param shareToken - The share token to check
 * @returns True if token exists
 */
export async function checkShareTokenExists(shareToken: string): Promise<boolean> {
  try {
    const database = getFirestoreDb();
    if (!database) {
      return false;
    }

    const planRef = doc(database, SHARED_PLANS_COLLECTION, shareToken);
    const planSnap = await getDoc(planRef);

    return planSnap.exists();
  } catch (error) {
    console.error('Error checking share token:', error);
    return false;
  }
}

export default {
  initializeFirebase,
  getFirebaseAuth,
  getFirestoreDb,
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
  sharePlanToFirebase,
  getSharedPlanFromFirebase,
  updateSharedPlan,
  deleteSharedPlan,
  checkShareTokenExists,
};
