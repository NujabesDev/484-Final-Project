// Background service worker
import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, signInWithCredential, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth/web-extension';
import { getFirestore, onSnapshot, collection } from 'firebase/firestore';
import { buildAuthUrl } from './config.js';
import { loadLinksFromFirestore, saveLinkToFirestore, deleteLinkFromFirestore } from './services/firestore.js';
import { isRedditPostUrl, scrapeRedditThumbnail } from './services/reddit-scraper.js';

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

  if (message.action === 'GET_PRODUCTIVITY_MODE') {
    handleGetProductivityMode(sendResponse);
    return true;
  }

  if (message.action === 'SET_PRODUCTIVITY_MODE') {
    handleSetProductivityMode(message, sendResponse);
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

    // Load cache first (instant!)
    const cached = await loadCacheFromLocal();

    // Restart real-time sync in background if needed (don't wait for it!)
    // This prevents blocking on onSnapshot's initial Firestore fetch
    if (!realtimeSyncUnsubscribe) {
      startRealtimeSync(auth.currentUser.uid);
    }

    // Return cache immediately if available (don't wait for sync to start)
    if (cached.length > 0) {
      sendResponse({
        success: true,
        links: cached
      });
      return;
    }

    // No cache - do initial fetch from Firestore
    // (This only happens on very first load or after clearing storage)
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

// Save link to Firestore with cache update
async function handleSaveLink(message, sendResponse) {
  try {
    const { url, title, timeEstimate } = message;

    if (!auth.currentUser?.uid) {
      sendResponse({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    // Check cache for duplicates first (instant - avoids network call in most cases)
    // Firestore also checks for duplicates as safety net (handles stale cache edge cases)
    const currentCache = await loadCacheFromLocal();
    if (currentCache.some(link => link.url === url)) {
      sendResponse({
        success: false,
        error: 'Link already exists'
      });
      return;
    }

    // Scrape Reddit thumbnail if this is a Reddit post
    let thumbnail = null;
    if (isRedditPostUrl(url)) {
      console.log('Detected Reddit post, scraping thumbnail...');
      thumbnail = await scrapeRedditThumbnail(url);
      if (thumbnail) {
        console.log('Reddit thumbnail scraped:', thumbnail);
      } else {
        console.log('No thumbnail found for Reddit post');
      }
    }

    // Save to Firestore (waits for confirmation, includes duplicate check as safety net)
    const newLink = await saveLinkToFirestore(db, auth.currentUser.uid, url, title, thumbnail, timeEstimate);

    // Update cache after successful Firestore save
    // onSnapshot will also update cache, but this ensures immediate popup feedback
    // Check prevents duplicate if onSnapshot already fired
    if (!currentCache.some(l => l.id === newLink.id)) {
      await saveCacheToLocal([...currentCache, newLink]);
    }

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

// Delete link from Firestore with cache update
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

    // Load cache before delete operation
    const currentCache = await loadCacheFromLocal();

    // Delete from Firestore (waits for confirmation)
    await deleteLinkFromFirestore(db, auth.currentUser.uid, linkId);

    // Update cache after successful Firestore delete
    // onSnapshot will also update cache, but this ensures immediate popup feedback
    await saveCacheToLocal(currentCache.filter(l => l.id !== linkId));

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

// Get productivity mode state
async function handleGetProductivityMode(sendResponse) {
  try {
    const result = await chrome.storage.local.get('productivityMode');
    const enabled = result.productivityMode || false;

    sendResponse({
      success: true,
      enabled: enabled
    });
  } catch (error) {
    console.error('Failed to get productivity mode:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Set productivity mode state
async function handleSetProductivityMode(message, sendResponse) {
  try {
    const { enabled } = message;

    await chrome.storage.local.set({ productivityMode: enabled });

    sendResponse({
      success: true,
      enabled: enabled
    });
  } catch (error) {
    console.error('Failed to set productivity mode:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}
