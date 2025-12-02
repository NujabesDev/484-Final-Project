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

// Auth state tracking
let authReady = false;
let authReadyPromise = null;
let pendingSaveRequests = [];

// Wait for Firebase auth to restore from IndexedDB with retry logic
async function waitForAuth(timeout = 10000, retryAttempt = 0) {
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000]; // Exponential backoff

  console.log(`[AUTH] waitForAuth called (attempt ${retryAttempt + 1}/${maxRetries + 1}, timeout: ${timeout}ms)`);

  // If auth is already ready, return immediately
  if (authReady && auth.currentUser) {
    console.log('[AUTH] Auth already ready, user:', auth.currentUser.uid);
    return Promise.resolve(auth.currentUser);
  }

  // If we already have a pending promise, return it
  if (authReadyPromise) {
    console.log('[AUTH] Returning existing auth promise');
    return authReadyPromise;
  }

  // Create new promise to wait for auth
  authReadyPromise = new Promise((resolve) => {
    const timeoutId = setTimeout(async () => {
      console.log(`[AUTH] Timeout reached after ${timeout}ms`);

      // Try retry logic if we have retries left and still no user
      if (retryAttempt < maxRetries && !auth.currentUser) {
        const delay = retryDelays[retryAttempt];
        console.log(`[AUTH] Retrying after ${delay}ms delay...`);
        authReadyPromise = null;

        // Wait and retry
        await new Promise(r => setTimeout(r, delay));
        const user = await waitForAuth(timeout, retryAttempt + 1);
        resolve(user);
        return;
      }

      // No more retries - proceed with current state
      console.log('[AUTH] No more retries, proceeding with current state:', auth.currentUser ? 'AUTHENTICATED' : 'NOT AUTHENTICATED');
      authReady = true;
      authReadyPromise = null;
      resolve(auth.currentUser);
    }, timeout);

    // Check immediately
    if (auth.currentUser) {
      console.log('[AUTH] User immediately available:', auth.currentUser.uid);
      clearTimeout(timeoutId);
      authReady = true;
      authReadyPromise = null;
      resolve(auth.currentUser);
      return;
    }

    console.log('[AUTH] Waiting for onAuthStateChanged...');

    // Wait for onAuthStateChanged to fire
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[AUTH] onAuthStateChanged fired, user:', user ? user.uid : 'null');
      clearTimeout(timeoutId);
      authReady = true;
      authReadyPromise = null;
      unsubscribe();
      resolve(user);
    });
  });

  return authReadyPromise;
}

// Process any pending save requests after auth is confirmed
async function processPendingSaveRequests() {
  if (pendingSaveRequests.length === 0) return;

  console.log(`[AUTH] Processing ${pendingSaveRequests.length} pending save requests`);

  const requests = [...pendingSaveRequests];
  pendingSaveRequests = [];

  for (const { message, sendResponse } of requests) {
    try {
      await handleSaveLink(message, sendResponse);
    } catch (error) {
      console.error('[AUTH] Failed to process pending save request:', error);
      sendResponse({
        success: false,
        error: 'Failed to process pending request: ' + error.message
      });
    }
  }
}

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
  authReady = true; // Mark auth as ready whenever state changes
  if (user) {
    console.log('[AUTH] User signed in:', user.uid);
    startRealtimeSync(user.uid);

    // Process any pending save requests that were waiting for auth
    await processPendingSaveRequests();
  } else {
    console.log('[AUTH] User signed out');
    stopRealtimeSync();
    await clearLinkCache();

    // Clear any pending requests on sign out
    if (pendingSaveRequests.length > 0) {
      console.log(`[AUTH] Clearing ${pendingSaveRequests.length} pending requests due to sign out`);
      const requests = [...pendingSaveRequests];
      pendingSaveRequests = [];
      requests.forEach(({ sendResponse }) => {
        sendResponse({
          success: false,
          error: 'Authentication required - please sign in'
        });
      });
    }
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
    console.log('[AUTH] Received auth token from website');
    const { token } = message;
    const credential = GoogleAuthProvider.credential(token);

    console.log('[AUTH] Signing in with credential...');
    await signInWithCredential(auth, credential);
    console.log('[AUTH] Sign in successful');

    sendResponse({ success: true });

    // Note: onAuthStateChanged will fire and process pending requests automatically
  } catch (error) {
    console.error('[AUTH] Sign in failed:', error);
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

    console.log('[SAVE] Save link request:', url);

    // Wait for auth to be ready (handles IndexedDB restoration delay)
    console.log('[SAVE] Waiting for auth to be ready...');
    const user = await waitForAuth();

    if (!user?.uid) {
      // If still no user after waiting with retries, check if we should queue
      // This can happen on fresh install or if auth is taking longer than expected
      if (!authReady) {
        console.log('[SAVE] Auth not ready yet, queuing request for processing after sign-in');
        pendingSaveRequests.push({ message, sendResponse });

        // Don't call sendResponse yet - will be called when request is processed
        return;
      }

      console.log('[SAVE] No authenticated user after waiting - user needs to sign in');
      sendResponse({
        success: false,
        error: 'Not authenticated - please sign in first'
      });
      return;
    }

    console.log('[SAVE] Auth ready, user:', user.uid);

    // Check cache for duplicates first (instant - avoids network call in most cases)
    // Firestore also checks for duplicates as safety net (handles stale cache edge cases)
    const currentCache = await loadCacheFromLocal();
    if (currentCache.some(link => link.url === url)) {
      console.log('[SAVE] Duplicate link found in cache');
      sendResponse({
        success: false,
        error: 'Link already exists'
      });
      return;
    }

    // Scrape Reddit thumbnail if this is a Reddit post
    let thumbnail = null;
    if (isRedditPostUrl(url)) {
      console.log('[SAVE] Detected Reddit post, scraping thumbnail...');
      thumbnail = await scrapeRedditThumbnail(url);
      if (thumbnail) {
        console.log('[SAVE] Reddit thumbnail scraped:', thumbnail);
      } else {
        console.log('[SAVE] No thumbnail found for Reddit post');
      }
    }

    console.log('[SAVE] Saving to Firestore...');
    // Save to Firestore (waits for confirmation, includes duplicate check as safety net)
    const newLink = await saveLinkToFirestore(db, user.uid, url, title, thumbnail, timeEstimate);
    console.log('[SAVE] Successfully saved to Firestore:', newLink.id);

    // Update cache after successful Firestore save
    // onSnapshot will also update cache, but this ensures immediate popup feedback
    // Check prevents duplicate if onSnapshot already fired
    if (!currentCache.some(l => l.id === newLink.id)) {
      await saveCacheToLocal([...currentCache, newLink]);
      console.log('[SAVE] Cache updated');
    }

    sendResponse({
      success: true,
      link: newLink
    });
  } catch (error) {
    console.error('[SAVE] Failed to save link:', error);
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
