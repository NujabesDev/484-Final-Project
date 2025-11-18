// Background service worker
import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, signInWithCredential, GoogleAuthProvider } from 'firebase/auth/web-extension';
import { getFirestore } from 'firebase/firestore';
import { buildAuthUrl } from './config.js';

// Firebase configuration
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
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
});

export const db = getFirestore(app);

chrome.runtime.onInstalled.addListener((details) => {
  // Auto-open website on first install (not on updates)
  if (details.reason === 'install') {
    chrome.tabs.create({ url: buildAuthUrl() });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'AUTH_SUCCESS') {
    handleAuthSuccess(message, sender, sendResponse);
    return true; // Keep channel open for async response
  }

  return false;
});

// Handle authentication success from website
async function handleAuthSuccess(message, sender, sendResponse) {
  try {
    const { token } = message;

    // Sign in to Firebase Auth with the Google OAuth ID token
    // Firebase will persist the session to IndexedDB and handle token refresh automatically
    const credential = GoogleAuthProvider.credential(token);
    await signInWithCredential(auth, credential);

    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
