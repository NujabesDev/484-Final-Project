// Background service worker
import { db, getCurrentUser, isAuthenticated, signInWithStoredToken } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

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
  if (message.type === 'LINK_INTERCEPTED') {
    handleInterceptedLink(message, sender.tab);
    sendResponse({ success: true });
    return true;
  }

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
      authToken: token,
      authTimestamp: Date.now()
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

// Handle intercepted link
async function handleInterceptedLink(data, tab) {
  const { url, title } = data;
  const saved = await saveToQueue(url, title);
  if (saved) showSavedNotification(tab.id);
}

// Save a link to the queue
// Saves only to Firestore - requires authentication
async function saveToQueue(url, title) {
  try {
    // Get auth state
    const result = await chrome.storage.local.get(['user']);
    const user = result.user;

    // Require authentication
    if (!user || !user.uid) {
      console.error('User not authenticated - cannot save link');
      return false;
    }

    // Ensure we're signed in to Firebase Auth
    try {
      await signInWithStoredToken();
    } catch (error) {
      // Token expired - user needs to sign in again
      if (error.message === 'TOKEN_EXPIRED' ||
          error.code?.startsWith('auth/')) {
        console.error('Auth token expired, cannot save link');
        return false;
      }
      throw error; // Re-throw other errors
    }

    // Check for duplicates in Firestore
    const linksRef = collection(db, 'users', user.uid, 'links');
    const q = query(linksRef, where('url', '==', url));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log('Link already exists in Firestore');
      return false;
    }

    // Save to Firestore
    await addDoc(collection(db, 'users', user.uid, 'links'), {
      url: url,
      title: title || url,
      timestamp: Date.now(),
      createdAt: Date.now()
    });

    console.log('Link saved to Firestore for user:', user.uid);
    return true;
  } catch (error) {
    console.error('Failed to save link to Firestore:', error);
    return false;
  }
}

// Show notification that link was saved
function showSavedNotification(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const notification = document.createElement('div');
      notification.textContent = '📚 Saved for later!';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #34a853;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: system-ui, sans-serif;
        font-size: 16px;
        font-weight: 600;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    }
  });
}
