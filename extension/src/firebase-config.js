// Firebase configuration for extension
// Uses firebase/auth/web-extension for Manifest V3 service worker compatibility
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth/web-extension';
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

// Initialize services - using web-extension auth for service worker
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Sign in to Firebase Auth using the Google OAuth ID token from website
 *
 * TOKEN FLOW:
 * 1. Website performs Google OAuth and gets a Google OAuth ID token (oauthIdToken)
 * 2. Website sends this token to extension via postMessage
 * 3. Extension stores it in chrome.storage.local as 'authToken'
 * 4. This function retrieves that token and creates a Firebase credential
 * 5. Firebase accepts the Google OAuth ID token and signs the user in
 *
 * NOTE: This is a Google OAuth ID token, NOT a Firebase ID token.
 * It's valid for ~1 hour from when Google issued it.
 *
 * This authenticates the extension so Firestore security rules work.
 */
export async function signInWithStoredToken() {
  try {
    // Check if already signed in
    if (auth.currentUser) {
      console.log('Already signed in to Firebase:', auth.currentUser.uid);
      return auth.currentUser;
    }

    // Get stored Google OAuth ID token from website auth
    const result = await chrome.storage.local.get(['authToken', 'user', 'authTimestamp']);

    if (!result.authToken || !result.user) {
      console.log('No stored auth token found');
      return null;
    }

    // Check if token is expired (Google OAuth tokens expire after 1 hour)
    // If token is older than 55 minutes, prompt re-authentication
    const tokenAge = Date.now() - (result.authTimestamp || 0);
    const TOKEN_MAX_AGE = 55 * 60 * 1000; // 55 minutes in milliseconds

    if (tokenAge > TOKEN_MAX_AGE) {
      console.log('Token is older than 55 minutes, may be expired');
      // Clear old token and prompt re-auth
      await chrome.storage.local.remove(['user', 'authToken', 'authTimestamp']);
      throw new Error('TOKEN_EXPIRED');
    }

    // Create Google credential from Google OAuth ID token and sign in
    const credential = GoogleAuthProvider.credential(result.authToken);
    const userCredential = await signInWithCredential(auth, credential);

    console.log('Successfully signed in to Firebase:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Failed to sign in with stored token:', error);

    // Handle expired or invalid tokens
    if (error.message === 'TOKEN_EXPIRED' ||
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-token-expired' ||
        error.code === 'auth/invalid-id-token') {
      console.log('Token expired or invalid, clearing auth data');
      await chrome.storage.local.remove(['user', 'authToken', 'authTimestamp']);
    }

    throw error; // Re-throw so caller can handle (e.g., show "Please sign in again")
  }
}

/**
 * Get current authenticated user from storage
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
