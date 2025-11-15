// Background service worker
import { signInWithStoredToken, setupAuthListener } from './firebase-config.js';

// Website URL for authentication
const WEBSITE_URL = 'https://484-final-project-three.vercel.app/';

// Set up Firebase auth state listener
// This runs when service worker starts and handles automatic token refresh
setupAuthListener(async (user) => {
  if (user) {
    // User is signed in - Firebase is handling token refresh automatically
    // Update chrome.storage with current user data for quick access
    await chrome.storage.local.set({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    });
  } else {
    // User is signed out - clear storage and cache
    await chrome.storage.local.remove(['user', 'authToken', 'cachedQueue', 'cacheTimestamp']);
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  // Auto-open website on first install (not on updates)
  if (details.reason === 'install') {
    const extensionId = chrome.runtime.id;
    const authUrl = `${WEBSITE_URL}?source=extension&extensionId=${extensionId}`;
    chrome.tabs.create({ url: authUrl });
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
    const { user, token } = message;

    // Store auth data in chrome.storage
    // The website handles OAuth, and sends the token + user info here
    await chrome.storage.local.set({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      },
      authToken: token
    });

    // Sign in to Firebase Auth with the token
    // Firebase will persist the session and handle token refresh automatically
    // The onAuthStateChanged listener above will keep chrome.storage in sync
    try {
      await signInWithStoredToken();
    } catch (error) {
      // Silent failure - auth will be retried when popup opens
    }

    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
