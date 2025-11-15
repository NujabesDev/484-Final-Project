// Firebase configuration for extension
// Uses firebase/auth/web-extension for Manifest V3 service worker compatibility
import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, signInWithCredential, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth/web-extension';
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

// Initialize auth with IndexedDB persistence for service worker compatibility
// This enables automatic token refresh and persistent auth state
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
});

export const db = getFirestore(app);

/**
 * Sign in to Firebase Auth using the Google OAuth ID token from website.
 * The website performs OAuth, sends the token via postMessage, and this function
 * retrieves it from chrome.storage.local to authenticate with Firebase.
 * Firebase will automatically persist the session and handle token refresh.
 */
export async function signInWithStoredToken() {
  try {
    // Check if already signed in
    if (auth.currentUser) {
      return auth.currentUser;
    }

    // Get stored Google OAuth ID token from website auth
    const result = await chrome.storage.local.get(['authToken']);

    if (!result.authToken) {
      return null;
    }

    // Create Google credential from Google OAuth ID token and sign in
    // Firebase will persist the session to IndexedDB and handle token refresh automatically
    const credential = GoogleAuthProvider.credential(result.authToken);
    const userCredential = await signInWithCredential(auth, credential);

    return userCredential.user;
  } catch (error) {
    // If sign-in fails, clear stored token
    // Firebase persistence will handle the session after successful sign-in
    if (error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-token-expired' ||
        error.code === 'auth/invalid-id-token') {
      await chrome.storage.local.remove(['user', 'authToken']);
    }

    throw error;
  }
}

/**
 * Set up auth state listener.
 * Firebase automatically refreshes tokens and persists auth state.
 * Call this once when the service worker starts.
 */
export function setupAuthListener(callback) {
  return onAuthStateChanged(auth, callback);
}

export default app;
