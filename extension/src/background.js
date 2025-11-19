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

// Initialize auth with IndexedDB persistence for service worker compatibility
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
});

const db = getFirestore(app);

// Export for services/firestore.js
export { auth, db };

// Real-time sync state
let realtimeSyncUnsubscribe = null;
let currentSyncUserId = null;

// Start real-time listener for user's links
function startRealtimeSync(userId) {
  // Already listening for this user
  if (realtimeSyncUnsubscribe && currentSyncUserId === userId) {
    return;
  }

  // Stop any existing listener before starting a new one
  if (realtimeSyncUnsubscribe) {
    realtimeSyncUnsubscribe();
    realtimeSyncUnsubscribe = null;
  }

  console.log('🔥 Starting real-time sync for user:', userId);

  const linksRef = collection(db, 'users', userId, 'links');

  realtimeSyncUnsubscribe = onSnapshot(
    linksRef,
    (snapshot) => {
      // Real-time update received from Firestore!
      const freshLinks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update cache automatically when Firestore changes
      saveCacheToLocal(freshLinks);
    },
    (error) => {
      console.error('Real-time sync error:', error);
      // Firestore will automatically retry connection
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

// Cache management (NO TIMESTAMP - real-time sync keeps it fresh!)
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
    // User signed in - start real-time sync
    console.log('User signed in:', user.uid);
    startRealtimeSync(user.uid);
  } else {
    // User signed out - stop sync and clear cache
    console.log('User signed out');
    stopRealtimeSync();
    await clearLinkCache();
  }
});

// Service worker restart recovery:
// Ensure sync restarts if service worker wakes up with existing session
// onAuthStateChanged fires on registration, but add defensive check
setTimeout(() => {
  if (auth.currentUser && !realtimeSyncUnsubscribe) {
    console.log('Service worker restart detected - restarting sync');
    startRealtimeSync(auth.currentUser.uid);
  }
}, 1000); // Wait 1s for Firebase to restore session from IndexedDB

chrome.runtime.onInstalled.addListener((details) => {
  // Auto-open website on first install (not on updates)
  if (details.reason === 'install') {
    chrome.tabs.create({ url: buildAuthUrl() });
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Auth success from content script
  if (message.action === 'AUTH_SUCCESS') {
    handleAuthSuccess(message, sendResponse);
    return true;
  }

  // Get auth state
  if (message.action === 'GET_AUTH_STATE') {
    handleGetAuthState(sendResponse);
    return true;
  }

  // Get links (from cache if available and valid)
  if (message.action === 'GET_LINKS') {
    handleGetLinks(sendResponse);
    return true;
  }

  // Save link
  if (message.action === 'SAVE_LINK') {
    handleSaveLink(message, sendResponse);
    return true;
  }

  // Delete link
  if (message.action === 'DELETE_LINK') {
    handleDeleteLink(message, sendResponse);
    return true;
  }

  return false;
});

// Handle authentication success from website
async function handleAuthSuccess(message, sendResponse) {
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

// Get current auth state
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

// Get links - returns cache (real-time sync keeps it fresh!)
async function handleGetLinks(sendResponse) {
  try {
    // Check if user is authenticated
    if (!auth.currentUser?.uid) {
      sendResponse({ success: true, links: [] });
      return;
    }

    // Ensure real-time sync is running (in case service worker restarted)
    if (!realtimeSyncUnsubscribe) {
      startRealtimeSync(auth.currentUser.uid);
    }

    // Load cache
    const cached = await loadCacheFromLocal();

    // If cache exists, return it (onSnapshot keeps it fresh!)
    if (cached.length > 0) {
      sendResponse({
        success: true,
        links: cached
      });
      return;
    }

    // No cache yet - fetch from Firestore once
    // (onSnapshot listener will keep it updated from now on)
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

// Save link to Firestore (onSnapshot will update cache automatically)
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

    // Save to Firestore - onSnapshot listener will update cache automatically
    const newLink = await saveLinkToFirestore(db, auth.currentUser.uid, url, title);

    // Note: Cache will be updated automatically by onSnapshot listener
    // No manual cache update needed - eliminates redundant writes

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

// Delete link from Firestore (onSnapshot will update cache automatically)
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

    // Delete from Firestore - onSnapshot listener will update cache automatically
    await deleteLinkFromFirestore(db, auth.currentUser.uid, linkId);

    // Note: Cache will be updated automatically by onSnapshot listener
    // No manual cache update needed - eliminates redundant writes

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
