// Background service worker
import { signInWithStoredToken, setupAuthListener } from './firebase-config.js';

// Website URL for authentication
const WEBSITE_URL = 'https://484-final-project-three.vercel.app/';

// Set up Firebase auth state listener
// This runs when service worker starts and handles automatic token refresh
// Firebase Auth persists the session automatically, no need to sync to chrome.storage
setupAuthListener(async (user) => {
  if (!user) {
    // User is signed out - clear storage and cache
    await chrome.storage.local.remove(['authToken', 'cachedQueue', 'cacheTimestamp']);
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
    const { token } = message;

    // Store only the auth token in chrome.storage
    // The website handles OAuth and sends the token here
    await chrome.storage.local.set({ authToken: token });

    // Sign in to Firebase Auth with the token
    // Firebase will persist the session and handle token refresh automatically
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
