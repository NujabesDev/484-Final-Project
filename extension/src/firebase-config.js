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
 * Sign in to Firebase Auth using the Firebase ID token from website
 * This authenticates the extension so Firestore security rules work
 */
export async function signInWithStoredToken() {
  try {
    // Check if already signed in
    if (auth.currentUser) {
      console.log('Already signed in to Firebase:', auth.currentUser.uid);
      return auth.currentUser;
    }

    // Get stored Firebase ID token from website auth
    const result = await chrome.storage.local.get(['authToken', 'user']);

    if (!result.authToken || !result.user) {
      console.log('No stored auth token found');
      return null;
    }

    // Create Google credential from Firebase ID token and sign in
    const credential = GoogleAuthProvider.credential(result.authToken);
    const userCredential = await signInWithCredential(auth, credential);

    console.log('Successfully signed in to Firebase:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Failed to sign in with stored token:', error);

    // Token might be expired or invalid, clear it
    if (error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-token-expired' ||
        error.code === 'auth/invalid-id-token') {
      console.log('Token expired or invalid, clearing auth data');
      await chrome.storage.local.remove(['user', 'authToken', 'authTimestamp']);
    }

    return null;
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
