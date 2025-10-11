// Authentication utilities
// Shared between extension and website

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "./firebase-config.js";

// Google OAuth provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google OAuth using popup
 * @returns {Promise<UserCredential>}
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Called with user object or null
 * @returns {Function} Unsubscribe function
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user
 * @returns {User | null}
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};
