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
 * Sign in to Firebase Auth using the Google OAuth ID token from website.
 * The website performs OAuth, sends the token via postMessage, and this function
 * retrieves it from chrome.storage.local to authenticate with Firebase.
 * This enables Firestore security rules to work properly.
 */
export async function signInWithStoredToken() {
  try {
    // Check if already signed in
    if (auth.currentUser) {
      return auth.currentUser;
    }

    // Get stored Google OAuth ID token from website auth
    const result = await chrome.storage.local.get(['authToken', 'user']);

    if (!result.authToken || !result.user) {
      return null;
    }

    // Create Google credential from Google OAuth ID token and sign in
    // Firebase will throw an error if the token is expired, which we catch below
    const credential = GoogleAuthProvider.credential(result.authToken);
    const userCredential = await signInWithCredential(auth, credential);

    return userCredential.user;
  } catch (error) {
    // Handle expired or invalid tokens - Firebase will tell us if token is bad
    if (error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-token-expired' ||
        error.code === 'auth/invalid-id-token') {
      await chrome.storage.local.remove(['user', 'authToken']);
    }

    throw error; // Re-throw so caller can handle
  }
}

export default app;
