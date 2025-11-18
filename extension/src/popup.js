import { onAuthStateChanged } from 'firebase/auth/web-extension';
import { auth } from './background.js';
import { loadLinksFromFirestore, saveLinkToFirestore, deleteLinkFromFirestore } from './services/firestore.js';
import { WEBSITE_URL, buildAuthUrl } from './config.js';

// Global state
let currentLink = null;
let queue = [];

// Helper functions for stats
// Format timestamp to "2d ago" style
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const units = [
    { threshold: 2592000, divisor: 2592000, suffix: 'mo' },
    { threshold: 86400, divisor: 86400, suffix: 'd' },
    { threshold: 3600, divisor: 3600, suffix: 'h' },
    { threshold: 60, divisor: 60, suffix: 'm' }
  ];

  for (const unit of units) {
    if (seconds >= unit.threshold) {
      return Math.floor(seconds / unit.divisor) + unit.suffix + ' ago';
    }
  }

  return '0m ago';
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
const linkFavicon = document.getElementById('linkFavicon');
const queueCount = document.getElementById('queueCount');
const statsRemaining = document.getElementById('statsRemaining');
const statsTime = document.getElementById('statsTime');
const actionButtons = document.getElementById('actionButtons');
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
  }

  // Sync with Firestore in background (non-blocking)
  syncInBackground();
}

// Listen to Firebase auth state changes
onAuthStateChanged(auth, async (user) => {
  updateAuthUI();

  if (user) {
    // User signed in - sync with Firestore
    await syncInBackground();
  } else {
    // User signed out - clear queue and cache
    queue = [];
    await clearLinkCache();
    displayRandomLink();
  }
});

// Background sync function - runs async without blocking UI
async function syncInBackground() {
  // Check Firebase auth state first - Firebase handles token refresh automatically
  // Firebase Auth with IndexedDB persistence automatically restores the session
  // No need to manually restore from chrome.storage - just check auth.currentUser

  // Update auth UI with current Firebase auth state
  updateAuthUI();

  // If user is authenticated, sync with Firestore
  if (auth.currentUser?.uid) {
    try {
      const freshLinks = await loadLinksFromFirestore(auth.currentUser.uid);

      // Check if data changed
      if (hasChanged(queue, freshLinks)) {
        // Update queue with fresh data
        queue = freshLinks;

        // Update cache
        await saveCacheToLocal(freshLinks);

        // Update UI with smooth transition
        displayRandomLink();
      }
    } catch (error) {
      // Failed to load links - keep existing queue
      console.error('Failed to sync with Firestore:', error);
      showErrorMessage('Failed to sync - using cached data');
    }
  } else {
    // Not authenticated - clear queue and cache
    queue = [];
    await clearLinkCache();
  }
}

// Check if links have changed (bidirectional comparison)
function hasChanged(oldLinks, newLinks) {
  if (oldLinks.length !== newLinks.length) return true;

  const oldIds = new Set(oldLinks.map(l => l.id));
  const newIds = new Set(newLinks.map(l => l.id));

  // Check both directions: additions and deletions
  return [...newIds].some(id => !oldIds.has(id)) ||
         [...oldIds].some(id => !newIds.has(id));
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
  // Open auth page with extension ID as parameter
  // Firebase Auth will persist session to IndexedDB
  // When popup reopens, auth.currentUser will be automatically restored
  chrome.tabs.create({ url: buildAuthUrl() });
}

// Handle dashboard button click
function handleDashboard() {
  chrome.tabs.create({ url: WEBSITE_URL });
}

// Cache management functions
async function saveCacheToLocal(links) {
  await chrome.storage.local.set({
    cachedQueue: links,
    cacheTimestamp: Date.now()
  });
}

async function loadCacheFromLocal() {
  const result = await chrome.storage.local.get(['cachedQueue', 'cacheTimestamp']);
  const links = result.cachedQueue;
  return {
    links: Array.isArray(links) ? links : [],
    timestamp: result.cacheTimestamp || 0
  };
}

async function clearLinkCache() {
  await chrome.storage.local.remove(['cachedQueue', 'cacheTimestamp']);
}

// Update button states based on queue size
function updateButtonStates() {
  const hasLinks = queue.length > 0;
  openBtn.disabled = !hasLinks;
  skipBtn.disabled = !hasLinks;
  deleteBtn.disabled = !hasLinks;
}

// Get a random link from the queue
function getRandomLink() {
  if (queue.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * queue.length);
  return queue[randomIndex];
}

// Display a random link in the UI
function displayRandomLink() {
  currentLink = getRandomLink();

  if (!currentLink) {
    // No links in queue - show empty state
    linkCard.classList.remove('hidden');
    actionButtons.classList.add('hidden');
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

  // Ensure link card and action buttons are visible
  linkCard.classList.remove('hidden');
  actionButtons.classList.remove('hidden');

  // Update button states and queue count
  updateButtonStates();
  updateQueueCount();
}

// Show error message to user
function showErrorMessage(message) {
  // Temporarily show error in link title
  const originalTitle = linkTitle.textContent;
  const originalUrl = linkUrl.textContent;

  linkTitle.textContent = message;
  linkUrl.textContent = '';
  linkTitle.style.color = '#ef4444'; // red-500

  // Reset after 2 seconds
  setTimeout(() => {
    linkTitle.style.color = '';
    // Restore original content or show empty state if queue is empty
    if (queue.length === 0) {
      linkTitle.textContent = 'Your queue is empty';
      linkUrl.textContent = 'Save a link below!';
    } else if (currentLink) {
      linkTitle.textContent = currentLink.title;
      linkUrl.textContent = simplifyUrl(currentLink.url);
    }
  }, 2000);
}

// Update queue count display with stats
function updateQueueCount() {
  if (queue.length === 0) {
    // Hide stats when queue is empty
    queueCount.classList.add('hidden');
    return;
  }

  // Show stats when there are links
  queueCount.classList.remove('hidden');

  const remaining = queue.length;
  statsRemaining.textContent = `${remaining} ${remaining !== 1 ? 'links' : 'link'}`;

  // Update time if we have a current link
  if (currentLink) {
    const timeAgo = getTimeAgo(currentLink.createdAt);
    statsTime.textContent = `${timeAgo}`;
  } else {
    statsTime.textContent = '0m Ago';
  }
}

// Save a new link to the queue
async function saveLink(url, title) {
  // Require authentication
  if (!auth.currentUser?.uid) {
    return;
  }

  try {
    // Save to Firestore (checks for duplicates internally)
    const newLink = await saveLinkToFirestore(auth.currentUser.uid, url, title);

    // Add to local queue array for immediate UI update
    queue.push(newLink);

    // Update cache
    await saveCacheToLocal(queue);

    displayRandomLink();
  } catch (error) {
    // Show error message to user
    if (error.message === 'Link already exists') {
      showErrorMessage('Link already saved!');
    } else {
      showErrorMessage('Failed to save link');
    }
  }
}

// Delete a link from the queue
async function deleteLink(id) {
  // Require authentication
  if (!auth.currentUser?.uid) {
    return;
  }

  try {
    // Delete from Firestore
    await deleteLinkFromFirestore(auth.currentUser.uid, id);

    // Remove from local queue array for immediate UI update
    queue = queue.filter(link => link.id !== id);

    // Update cache
    await saveCacheToLocal(queue);
  } catch (error) {
    // Show error message to user
    showErrorMessage('Failed to delete link');
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
  }
});

skipBtn.addEventListener('click', () => {
  // Just show a different random link
  displayRandomLink();
});

deleteBtn.addEventListener('click', async () => {
  if (currentLink) {
    await deleteLink(currentLink.id);
    displayRandomLink();
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
