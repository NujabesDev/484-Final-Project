// Background service worker
import { signInWithStoredToken } from './firebase-config.js';

// Website URL for authentication
const WEBSITE_URL = 'https://484-final-project-three.vercel.app/';

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Read Later Random extension installed!');

  // Auto-open website on first install (not on updates)
  if (details.reason === 'install') {
    const extensionId = chrome.runtime.id;
    const authUrl = `${WEBSITE_URL}?source=extension&extensionId=${extensionId}`;
    chrome.tabs.create({ url: authUrl });
    console.log('Opening website for first-time setup:', authUrl);
  }
});

// Listen for messages from content script AND website
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('External message received:', message.action, 'from:', sender.url);

  if (message.action === 'AUTH_SUCCESS') {
    handleAuthSuccess(message, sender, sendResponse);
    return true; // Keep channel open for async response
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
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
    // Both the extension and website share the same Firebase project
    // The website handles OAuth, and sends the token + user info here
    // The extension uses this to identify the user for Firestore queries
    await chrome.storage.local.set({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      },
      authToken: token
    });

    console.log('User authenticated:', user.email);
    console.log('Extension can now make Firebase queries for user:', user.uid);

    // Sign in to Firebase Auth with the token so Firestore queries work
    try {
      await signInWithStoredToken();
      console.log('Extension signed in to Firebase Auth');
    } catch (error) {
      console.error('Failed to sign in to Firebase Auth:', error);
    }

    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to store auth data:', error);
    sendResponse({ success: false, error: error.message });
  }
}
