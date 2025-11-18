import { auth, signInWithStoredToken } from './firebase-config.js';
import { loadLinksFromFirestore, saveLinkToFirestore, deleteLinkFromFirestore } from './services/firestore.js';

// Global state
let currentLink = null;
let queue = [];
let skippedLinks = [];

// Helper functions for stats
// Format timestamp to "2d ago" style
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return '0m ago';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
  return Math.floor(seconds / 2592000) + 'mo ago';
}

// Extract clean domain from URL
function simplifyUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}

// Get favicon URL from Google service
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return '';
  }
}

// DOM elements
const linkCard = document.getElementById('linkCard');
const linkTitle = document.getElementById('linkTitle');
const linkUrl = document.getElementById('linkUrl');
const queueCount = document.getElementById('queueCount');
const statsRemaining = document.getElementById('statsRemaining');
const statsTime = document.getElementById('statsTime');
const openBtn = document.getElementById('openBtn');
const skipBtn = document.getElementById('skipBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveCurrentBtn = document.getElementById('saveCurrentBtn');

// Auth elements
const signedOutDiv = document.getElementById('signedOut');
const signedInDiv = document.getElementById('signedIn');
const signInBtn = document.getElementById('signInBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const userAvatar = document.getElementById('userAvatar');

// Auth website URL
const AUTH_URL = 'https://484-final-project-three.vercel.app/';

// Initialize popup
async function init() {
  // Load all cached states synchronously for instant UI (no flicker)
  const cached = await loadCacheFromLocal();

  // Update UI immediately with cached data
  updateAuthUI();

  if (cached.links.length > 0) {
    // We have cache! Show it immediately
    queue = cached.links;
    displayRandomLink();
    updateQueueCount();
  }

  // Sync with Firestore in background (non-blocking)
  syncInBackground();
}

// Background sync function - runs async without blocking UI
async function syncInBackground() {
  // Check Firebase auth state first - Firebase handles token refresh automatically
  // If user is signed in via Firebase, their session persists across popup opens
  if (!auth.currentUser) {
    // Try to restore session from stored token
    try {
      await signInWithStoredToken();
    } catch (error) {
      // Token expired or invalid - clear cache and local storage
      await clearLinkCache();
      await chrome.storage.local.remove(['authToken']);

      // Update UI to show signed out state
      queue = [];
      displayRandomLink();
      updateAuthUI();
      return;
    }
  }

  // Update auth UI with current Firebase auth state
  updateAuthUI();

  // If user is authenticated, sync with Firestore
  if (auth.currentUser && auth.currentUser.uid) {
    const freshLinks = await loadLinksFromFirestore(auth.currentUser.uid);

    // Check if data changed
    if (hasChanged(queue, freshLinks)) {
      // Update queue with fresh data
      queue = freshLinks;

      // Update cache
      await saveCacheToLocal(freshLinks);

      // Update UI with smooth transition
      displayRandomLink();
      updateQueueCount();
    }
  } else {
    // Not authenticated - clear queue and cache
    queue = [];
    await clearLinkCache();
  }
}

// Check if links have changed
function hasChanged(oldLinks, newLinks) {
  // Quick check: different length = definitely changed
  if (oldLinks.length !== newLinks.length) return true;

  // Deep check: compare IDs (Firestore doc IDs)
  const oldIds = new Set(oldLinks.map(l => l.id));
  const newIds = new Set(newLinks.map(l => l.id));

  for (let id of newIds) {
    if (!oldIds.has(id)) return true;
  }

  for (let id of oldIds) {
    if (!newIds.has(id)) return true;
  }

  return false;
}

// Update auth UI based on current Firebase auth state
function updateAuthUI() {
  if (auth.currentUser) {
    // Signed in
    signedOutDiv.classList.add('hidden');
    signedInDiv.classList.remove('hidden');
    userAvatar.src = auth.currentUser.photoURL || 'https://via.placeholder.com/32';
  } else {
    // Signed out
    signedOutDiv.classList.remove('hidden');
    signedInDiv.classList.add('hidden');
  }
}

// Handle sign in
async function handleSignIn() {
  // Get extension ID
  const extensionId = chrome.runtime.id;

  // Open auth page with extension ID as parameter
  const authUrl = `${AUTH_URL}?source=extension&extensionId=${extensionId}`;

  // Open in new tab
  chrome.tabs.create({ url: authUrl });

  // Listen for storage changes to update UI when auth completes
  // Auth token is stored, then Firebase auth state changes
  chrome.storage.onChanged.addListener(function authListener(changes, namespace) {
    if (namespace === 'local' && changes.authToken) {
      init().then(() => {
        chrome.storage.onChanged.removeListener(authListener);
      });
    }
  });
}

// Handle dashboard button click
function handleDashboard() {
  chrome.tabs.create({ url: AUTH_URL });
}

// Load queue from storage
async function loadQueue() {
  // Require authentication to load queue
  if (!auth.currentUser || !auth.currentUser.uid) {
    queue = [];
    return;
  }

  queue = await loadLinksFromFirestore(auth.currentUser.uid);
}

// Cache management functions
async function saveCacheToLocal(links) {
  await chrome.storage.local.set({
    cachedQueue: links,
    cacheTimestamp: Date.now()
  });
}

async function loadCacheFromLocal() {
  try {
    const result = await chrome.storage.local.get(['cachedQueue', 'cacheTimestamp']);
    const links = result.cachedQueue || [];

    // Validate cache structure
    if (!Array.isArray(links)) {
      throw new Error('Invalid cache structure');
    }

    return {
      links,
      timestamp: result.cacheTimestamp || 0
    };
  } catch (error) {
    console.warn('Cache corrupted, clearing:', error);
    await chrome.storage.local.remove(['cachedQueue', 'cacheTimestamp']);
    return { links: [], timestamp: 0 };
  }
}

async function clearLinkCache() {
  await chrome.storage.local.remove(['cachedQueue', 'cacheTimestamp']);
}

// Update button states based on queue size
function updateButtonStates() {
  if (queue.length === 0) {
    // No links: disable all buttons
    openBtn.disabled = true;
    skipBtn.disabled = true;
    deleteBtn.disabled = true;
  } else if (queue.length === 1) {
    // 1 link: enable open/delete, disable skip
    openBtn.disabled = false;
    deleteBtn.disabled = false;
    skipBtn.disabled = true;
  } else {
    // 2+ links: enable all buttons
    openBtn.disabled = false;
    skipBtn.disabled = false;
    deleteBtn.disabled = false;
  }
}

// Get a random link from the queue (excluding skipped links)
function getRandomLink() {
  if (queue.length === 0) return null;

  // Filter out skipped links
  const availableLinks = queue.filter(link => !skippedLinks.includes(link.id));

  // If all links are skipped, reset the skipped list (cycle complete)
  if (availableLinks.length === 0 && queue.length > 0) {
    skippedLinks = [];
    const randomIndex = Math.floor(Math.random() * queue.length);
    return queue[randomIndex];
  }

  if (availableLinks.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * availableLinks.length);
  return availableLinks[randomIndex];
}

// Display a random link in the UI
function displayRandomLink() {
  currentLink = getRandomLink();
  const linkFavicon = document.getElementById('linkFavicon');

  if (!currentLink) {
    // No links in queue - show empty state
    linkCard.classList.remove('hidden');
    if (linkFavicon) {
      linkFavicon.classList.add('invisible');
    }
    linkTitle.textContent = 'Your queue is empty';
    linkUrl.textContent = 'Save a link below!';
    updateButtonStates();
    return;
  }

  // Update content - CSS handles transitions
  linkTitle.textContent = currentLink.title;
  linkUrl.textContent = simplifyUrl(currentLink.url);

  // Update favicon
  const faviconUrl = getFaviconUrl(currentLink.url);
  if (faviconUrl && linkFavicon) {
    linkFavicon.src = faviconUrl;
    linkFavicon.classList.remove('invisible');
  } else if (linkFavicon) {
    linkFavicon.classList.add('invisible');
  }

  // Ensure link card is visible
  linkCard.classList.remove('hidden');

  // Update button states
  updateButtonStates();
}

// Update queue count display with stats
function updateQueueCount() {
  // Show the queue count element (hidden by default in HTML)
  queueCount.classList.remove('hidden');

  if (queue.length === 0) {
    statsRemaining.textContent = 'No links saved';
    statsTime.textContent = '0m Ago';
    return;
  }

  const remaining = queue.length;
  statsRemaining.textContent = `${remaining} ${remaining !== 1 ? 'links' : 'link'}`;

  // Update time if we have a current link
  if (currentLink) {
    const timeAgo = getTimeAgo(currentLink.timestamp);
    statsTime.textContent = `${timeAgo}`;
  } else {
    statsTime.textContent = '0m Ago';
  }
}

// Save a new link to the queue
async function saveLink(url, title) {
  // Require authentication
  if (!auth.currentUser || !auth.currentUser.uid) {
    return;
  }

  try {
    // Save to Firestore (checks for duplicates internally)
    const newLink = await saveLinkToFirestore(auth.currentUser.uid, url, title);

    // Add to local queue array for immediate UI update
    queue.push(newLink);

    // Update cache
    await saveCacheToLocal(queue);

    updateQueueCount();
    displayRandomLink();
  } catch (error) {
    // Silent failure - errors handled by Firestore service
  }
}

// Delete a link from the queue
async function deleteLink(id) {
  // Require authentication
  if (!auth.currentUser || !auth.currentUser.uid) {
    return;
  }

  try {
    // Delete from Firestore
    await deleteLinkFromFirestore(auth.currentUser.uid, id);

    // Remove from local queue array for immediate UI update
    queue = queue.filter(link => link.id !== id);

    // Remove from skipped list if present
    skippedLinks = skippedLinks.filter(skippedId => skippedId !== id);

    // Update cache
    await saveCacheToLocal(queue);

    updateQueueCount();
  } catch (error) {
    // Silent failure - errors handled by Firestore service
  }
}

// Open link in new tab and remove from queue
async function openAndRemove(id) {
  const link = queue.find(l => l.id === id);
  if (link) {
    chrome.tabs.create({ url: link.url });
    await deleteLink(id);
  }
}

// Button event listeners
openBtn.addEventListener('click', async () => {
  if (currentLink) {
    await openAndRemove(currentLink.id);
    displayRandomLink();
    updateQueueCount();
  }
});

skipBtn.addEventListener('click', () => {
  // Do nothing if only 1 link in queue
  if (queue.length <= 1) return;

  // Add current link to skipped list so it won't show again until all others are exhausted
  if (currentLink && !skippedLinks.includes(currentLink.id)) {
    skippedLinks.push(currentLink.id);
  }
  displayRandomLink();
  updateQueueCount();
});

deleteBtn.addEventListener('click', async () => {
  if (currentLink) {
    await deleteLink(currentLink.id);
    displayRandomLink();
    updateQueueCount();
  }
});

saveCurrentBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await saveLink(tab.url, tab.title);
  }
});

// Auth button listeners
signInBtn.addEventListener('click', handleSignIn);
dashboardBtn.addEventListener('click', handleDashboard);

// Initialize when popup opens
init();
