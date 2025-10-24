// Background service worker
import { db, getCurrentUser, isAuthenticated } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

// Website URL for authentication (update this with your deployed URL)
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
// TODO: Update this to save to Firestore instead of local storage
async function saveToQueue(url, title) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['queue'], (result) => {
      const queue = result.queue || [];

      if (queue.some(link => link.url === url)) {
        resolve(false);
        return;
      }

      queue.push({
        id: Date.now().toString(),
        url: url,
        title: title || url,
        timestamp: Date.now()
      });

      chrome.storage.local.set({ queue }, () => resolve(true));
    });
  });
}

// Example: Save link to Firestore (use this instead of saveToQueue once ready)
async function saveToFirestore(url, title) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      console.error('User not authenticated, cannot save to Firestore');
      return false;
    }

    // Check for duplicates
    const linksRef = collection(db, 'links');
    const q = query(linksRef, where('userId', '==', user.uid), where('url', '==', url));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log('Link already exists in Firestore');
      return false;
    }

    // Add new link
    await addDoc(collection(db, 'links'), {
      userId: user.uid,
      url: url,
      title: title || url,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    });

    console.log('Link saved to Firestore');
    return true;
  } catch (error) {
    console.error('Failed to save to Firestore:', error);
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
