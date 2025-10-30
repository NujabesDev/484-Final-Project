// Firebase configuration for extension
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAG5sAYJWlPxbPWBt4F4Hn5P9O-DJZzGOA",
  authDomain: "cs484-extension-493e5.firebaseapp.com",
  projectId: "cs484-extension-493e5",
  storageBucket: "cs484-extension-493e5.firebasestorage.app",
  messagingSenderId: "662713761153",
  appId: "1:662713761153:web:0ca3507aeaf377e776bc80"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Sign in to Firebase Auth using stored Google OAuth token
 * This must be called before making any Firestore queries
 */
export async function signInWithStoredToken() {
  try {
    // Check if already signed in
    if (auth.currentUser) {
      console.log('Already signed in to Firebase:', auth.currentUser.uid);
      return auth.currentUser;
    }

    // Get stored auth token (Google OAuth ID token)
    const result = await chrome.storage.local.get(['authToken', 'user']);

    if (!result.authToken || !result.user) {
      console.log('No stored auth token found');
      return null;
    }

    // Sign in with the Google OAuth ID token
    const credential = GoogleAuthProvider.credential(result.authToken);
    const userCredential = await signInWithCredential(auth, credential);

    console.log('Successfully signed in to Firebase:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Failed to sign in with stored token:', error);
    // If token is expired or invalid, clear it
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-token-expired') {
      console.log('Token expired or invalid, clearing auth data');
      await chrome.storage.local.remove(['user', 'authToken', 'authTimestamp']);
    }
    return null;
  }
}

/**
 * Get current authenticated user from storage
 * Note: The extension uses the token stored from website auth
 * Both website and extension share the same Firebase project
 * The extension makes Firestore queries using the user's ID
 */
export async function getCurrentUser() {
  try {
    const result = await chrome.storage.local.get(['user', 'authToken']);

    if (result.user && result.authToken) {
      return result.user;
    }

    return null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}

export default app;
