// Background service worker
import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, signInWithCredential, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth/web-extension';
import { getFirestore, onSnapshot, collection } from 'firebase/firestore';
import { buildAuthUrl } from './config.js';
import { loadLinksFromFirestore, saveLinkToFirestore, deleteLinkFromFirestore } from './services/firestore.js';

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

// Initialize Firebase Auth with IndexedDB persistence
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
});

const db = getFirestore(app);

// Export for services/firestore.js
export { auth, db };

// Real-time sync state
let realtimeSyncUnsubscribe = null;
let currentSyncUserId = null;

// Start real-time Firestore listener for user's links
function startRealtimeSync(userId) {
  // Skip if already listening for this user
  if (realtimeSyncUnsubscribe && currentSyncUserId === userId) {
    return;
  }

  // Stop existing listener if present
  if (realtimeSyncUnsubscribe) {
    realtimeSyncUnsubscribe();
    realtimeSyncUnsubscribe = null;
  }

  console.log('🔥 Starting real-time sync for user:', userId);

  const linksRef = collection(db, 'users', userId, 'links');

  realtimeSyncUnsubscribe = onSnapshot(
    linksRef,
    (snapshot) => {
      // Map Firestore documents to link objects
      const freshLinks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update local cache with latest data
      saveCacheToLocal(freshLinks);
    },
    (error) => {
      console.error('Real-time sync error:', error);
    }
  );

  currentSyncUserId = userId;
}

// Stop real-time listener
function stopRealtimeSync() {
  if (realtimeSyncUnsubscribe) {
    realtimeSyncUnsubscribe();
    realtimeSyncUnsubscribe = null;
    currentSyncUserId = null;
    console.log('Real-time sync stopped');
  }
}

// Save links to local cache
async function saveCacheToLocal(links) {
  await chrome.storage.local.set({ cachedQueue: links });
}

async function loadCacheFromLocal() {
  const result = await chrome.storage.local.get('cachedQueue');
  return Array.isArray(result.cachedQueue) ? result.cachedQueue : [];
}

async function clearLinkCache() {
  await chrome.storage.local.remove('cachedQueue');
}

// Listen for Firebase auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('User signed in:', user.uid);
    startRealtimeSync(user.uid);
  } else {
    console.log('User signed out');
    stopRealtimeSync();
    await clearLinkCache();
  }
});

// Restart sync after service worker restart if user is already authenticated
setTimeout(() => {
  if (auth.currentUser && !realtimeSyncUnsubscribe) {
    console.log('Service worker restart detected - restarting sync');
    startRealtimeSync(auth.currentUser.uid);
  }
}, 1000);

chrome.runtime.onInstalled.addListener((details) => {
  // Open website on first install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: buildAuthUrl() });
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'AUTH_SUCCESS') {
    handleAuthSuccess(message, sendResponse);
    return true;
  }

  if (message.action === 'GET_AUTH_STATE') {
    handleGetAuthState(sendResponse);
    return true;
  }

  if (message.action === 'GET_LINKS') {
    handleGetLinks(sendResponse);
    return true;
  }

  if (message.action === 'SAVE_LINK') {
    handleSaveLink(message, sendResponse);
    return true;
  }

  if (message.action === 'DELETE_LINK') {
    handleDeleteLink(message, sendResponse);
    return true;
  }

  return false;
});

// Handle authentication token from website
async function handleAuthSuccess(message, sendResponse) {
  try {
    const { token } = message;
    const credential = GoogleAuthProvider.credential(token);
    await signInWithCredential(auth, credential);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Return current authentication state
function handleGetAuthState(sendResponse) {
  const user = auth.currentUser;
  sendResponse({
    success: true,
    authenticated: !!user,
    user: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    } : null
  });
}

// Return cached links or fetch from Firestore
async function handleGetLinks(sendResponse) {
  try {
    if (!auth.currentUser?.uid) {
      sendResponse({ success: true, links: [] });
      return;
    }

    // Ensure real-time sync is active
    if (!realtimeSyncUnsubscribe) {
      startRealtimeSync(auth.currentUser.uid);
    }

    const cached = await loadCacheFromLocal();

    // Return cache if available
    if (cached.length > 0) {
      sendResponse({
        success: true,
        links: cached
      });
      return;
    }

    // Fetch from Firestore if no cache exists
    const freshLinks = await loadLinksFromFirestore(db, auth.currentUser.uid);
    await saveCacheToLocal(freshLinks);

    sendResponse({
      success: true,
      links: freshLinks
    });
  } catch (error) {
    console.error('Failed to get links:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Save link to Firestore
async function handleSaveLink(message, sendResponse) {
  try {
    const { url, title } = message;

    if (!auth.currentUser?.uid) {
      sendResponse({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const newLink = await saveLinkToFirestore(db, auth.currentUser.uid, url, title);

    sendResponse({
      success: true,
      link: newLink
    });
  } catch (error) {
    console.error('Failed to save link:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Delete link from Firestore
async function handleDeleteLink(message, sendResponse) {
  try {
    const { linkId } = message;

    if (!auth.currentUser?.uid) {
      sendResponse({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    await deleteLinkFromFirestore(db, auth.currentUser.uid, linkId);

    sendResponse({
      success: true
    });
  } catch (error) {
    console.error('Failed to delete link:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}
