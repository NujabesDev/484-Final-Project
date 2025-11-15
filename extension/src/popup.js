import { auth, signInWithStoredToken } from './firebase-config.js';
import { loadLinksFromFirestore, saveLinkToFirestore, deleteLinkFromFirestore } from './services/firestore.js';

// Global state
let currentLink = null;
let queue = [];
let productivityMode = false;
let currentUser = null;
let skippedLinks = [];
let isAnimating = false;
let isInitialLoad = true;

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
const productivityToggle = document.getElementById('productivityToggle');

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
  await loadProductivityMode();
  await loadAuthState();

  // Update UI immediately with cached data
  updateToggle();
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
      await chrome.storage.local.remove(['user', 'authToken']);

      // Update UI to show signed out state
      currentUser = null;
      queue = [];
      displayRandomLink();
      updateAuthUI();
      return;
    }
  }

  // Load user info from storage for quick UI updates
  await loadAuthState();
  updateAuthUI();

  // If user is authenticated, sync with Firestore
  if (currentUser && currentUser.uid) {
    const freshLinks = await loadLinksFromFirestore(currentUser.uid);

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

  // Load productivity mode
  await loadProductivityMode();
  updateToggle();
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

// Load auth state from cache for instant UI display
// Firebase auth verification happens later in syncInBackground()
async function loadAuthState() {
  // Load cached user info first for instant display (no Firebase wait)
  const result = await chrome.storage.local.get(['user']);
  if (result.user) {
    currentUser = result.user;
  } else {
    currentUser = null;
  }
}

// Update auth UI based on current state
function updateAuthUI() {
  if (currentUser) {
    // Signed in
    signedOutDiv.classList.add('hidden');
    signedInDiv.classList.remove('hidden');
    userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/32';
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
  chrome.storage.onChanged.addListener(function authListener(changes, namespace) {
    if (namespace === 'local' && changes.user) {
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
  if (!currentUser || !currentUser.uid) {
    queue = [];
    return;
  }

  queue = await loadLinksFromFirestore(currentUser.uid);
}

// Load productivity mode from storage
async function loadProductivityMode() {
  const result = await chrome.storage.local.get(['productivityMode']);
  productivityMode = result.productivityMode ?? false;
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

// Update toggle UI
function updateToggle() {
  if (productivityMode) {
    productivityToggle.classList.add('active');
  } else {
    productivityToggle.classList.remove('active');
  }
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
  if (isAnimating && !isInitialLoad) return;

  currentLink = getRandomLink();

  if (!currentLink) {
    // No links in queue - show empty state INSIDE link card
    linkCard.classList.remove('hidden');
    const linkFavicon = document.getElementById('linkFavicon');
    if (linkFavicon) {
      linkFavicon.classList.add('invisible');
    }
    linkTitle.textContent = 'Your queue is empty';
    linkUrl.textContent = 'Save a link below!';
    updateButtonStates();
    return;
  }

  // FAST PATH: Initial load - no animations, instant render
  if (isInitialLoad) {
    renderLinkContent();
    linkCard.classList.remove('hidden');
    updateButtonStates();
    isInitialLoad = false; // Reset flag after first render
    return;
  }

  // ANIMATED PATH: User interactions - smooth transitions
  // Set animation flag to prevent clicks
  isAnimating = true;

  const linkFavicon = document.getElementById('linkFavicon');

  // Preload favicon FIRST before starting any animation
  const faviconUrl = getFaviconUrl(currentLink.url);
  const faviconImg = new Image();

  const startAnimation = () => {
    // Step 1: Hide old favicon and fade out old content
    if (linkFavicon) {
      linkFavicon.classList.add('invisible');
    }
    linkTitle.classList.add('link-exit');
    linkUrl.classList.add('link-exit');

    // Step 2: After exit animation completes (150ms), update content
    setTimeout(() => {
      // Update text content
      linkTitle.textContent = currentLink.title;
      linkUrl.textContent = simplifyUrl(currentLink.url);

      // Update favicon (already preloaded!)
      if (faviconUrl && linkFavicon) {
        linkFavicon.src = faviconImg.src;
        linkFavicon.classList.remove('invisible');
      } else if (linkFavicon) {
        linkFavicon.classList.add('invisible');
      }

      // Ensure link card is visible
      linkCard.classList.remove('hidden');

      // Step 3: Fade in new content (text + favicon together)
      linkTitle.classList.remove('link-exit');
      linkUrl.classList.remove('link-exit');
      linkTitle.classList.add('link-enter');
      linkUrl.classList.add('link-enter');
      if (faviconUrl && linkFavicon) {
        linkFavicon.classList.add('link-enter');
      }

      // Step 4: Clean up animation classes after enter completes (150ms)
      setTimeout(() => {
        linkTitle.classList.remove('link-enter');
        linkUrl.classList.remove('link-enter');
        if (linkFavicon) {
          linkFavicon.classList.remove('link-enter');
        }

        // Update button states based on current queue size
        updateButtonStates();

        // Clear animation flag
        isAnimating = false;
      }, 150);
    }, 150);
  };

  // Preload favicon before starting animation (prevents async race conditions)
  if (faviconUrl) {
    faviconImg.src = faviconUrl;
    faviconImg.onload = startAnimation;
    faviconImg.onerror = startAnimation; // Start anyway if favicon fails
  } else {
    // No favicon - start animation immediately
    startAnimation();
  }
}

// Helper function to render link content (used by initial load path only)
function renderLinkContent() {
  const linkFavicon = document.getElementById('linkFavicon');

  // Update text content
  linkTitle.textContent = currentLink.title;
  linkUrl.textContent = simplifyUrl(currentLink.url);

  // Update favicon with preloading
  const faviconUrl = getFaviconUrl(currentLink.url);
  if (faviconUrl && linkFavicon) {
    const img = new Image();
    img.src = faviconUrl;
    img.onload = () => {
      linkFavicon.src = faviconUrl;
      linkFavicon.classList.remove('invisible');
    };
    img.onerror = () => {
      linkFavicon.classList.add('invisible');
    };
  } else if (linkFavicon) {
    linkFavicon.classList.add('invisible');
  }
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
  if (!currentUser || !currentUser.uid) {
    return;
  }

  try {
    // Save to Firestore (checks for duplicates internally)
    const newLink = await saveLinkToFirestore(currentUser.uid, url, title);

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
  if (!currentUser || !currentUser.uid) {
    return;
  }

  try {
    // Delete from Firestore
    await deleteLinkFromFirestore(currentUser.uid, id);

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
  if (currentLink && !isAnimating) {
    await openAndRemove(currentLink.id);
    displayRandomLink();
    updateQueueCount();
  }
});

skipBtn.addEventListener('click', () => {
  if (isAnimating) return;

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
  if (currentLink && !isAnimating) {
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

// Productivity mode toggle
productivityToggle.addEventListener('click', async () => {
  productivityMode = !productivityMode;
  await chrome.storage.local.set({ productivityMode });
  updateToggle();
});

// Auth button listeners
signInBtn.addEventListener('click', handleSignIn);
dashboardBtn.addEventListener('click', handleDashboard);

// Initialize when popup opens
init();
