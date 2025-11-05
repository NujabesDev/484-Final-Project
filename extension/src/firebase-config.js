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
    const result = await chrome.storage.local.get(['authToken', 'user']);

    if (!result.authToken || !result.user) {
      console.log('No stored auth token found');
      return null;
    }

    // Create Google credential from Google OAuth ID token and sign in
    // Firebase will throw an error if the token is expired, which we catch below
    const credential = GoogleAuthProvider.credential(result.authToken);
    const userCredential = await signInWithCredential(auth, credential);

    console.log('Successfully signed in to Firebase:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Failed to sign in with stored token:', error);

    // Handle expired or invalid tokens - Firebase will tell us if token is bad
    if (error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-token-expired' ||
        error.code === 'auth/invalid-id-token') {
      console.log('Token expired or invalid, clearing auth data');
      await chrome.storage.local.remove(['user', 'authToken']);
    }

    throw error; // Re-throw so caller can handle (e.g., show "Please sign in again")
  }
}

export default app;
