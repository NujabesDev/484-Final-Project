import { signInWithStoredToken } from './firebase-config.js';
import { loadLinksFromFirestore, saveLinkToFirestore, deleteLinkFromFirestore } from './services/firestore.js';

// Global state
let currentLink = null;
let queue = [];
let productivityMode = false;
let currentUser = null;
let skippedLinks = [];
let isAnimating = false;

// Helper functions for stats
// Format timestamp to "2d ago" style
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
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

// Calculate chronological position (1 = oldest saved)
function getChronologicalPosition(linkId) {
  const sortedByAge = [...queue].sort((a, b) => a.timestamp - b.timestamp);
  return sortedByAge.findIndex(link => link.id === linkId) + 1;
}

// DOM elements
const linkCard = document.getElementById('linkCard');
const linkTitle = document.getElementById('linkTitle');
const linkUrl = document.getElementById('linkUrl');
const emptyState = document.getElementById('emptyState');
const queueCount = document.getElementById('queueCount');
const statsRemaining = document.getElementById('statsRemaining');
const statsTime = document.getElementById('statsTime');
const openBtn = document.getElementById('openBtn');
const skipBtn = document.getElementById('skipBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveCurrentBtn = document.getElementById('saveCurrentBtn');
const productivityToggle = document.getElementById('productivityToggle');
const skeletonLoading = document.getElementById('skeletonLoading');
const skeletonCard = document.getElementById('skeletonCard');

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
  // Show skeleton loading
  showSkeleton();

  await loadAuthState();

  // Sign in to Firebase Auth if we have a stored token
  if (currentUser) {
    try {
      await signInWithStoredToken();
    } catch (error) {
      // Token expired or invalid - clear auth state and show sign-in UI
      if (error.code?.startsWith('auth/')) {
        console.log('Token expired, user needs to sign in again');
        currentUser = null;
        queue = [];
      }
    }
  }

  await loadQueue();
  await loadProductivityMode();

  // Hide skeleton and show content
  hideSkeleton();
  displayRandomLink();
  updateQueueCount();
  updateToggle();
  updateAuthUI();
}

// Show skeleton loading state
function showSkeleton() {
  queueCount.classList.add('hidden');
  skeletonLoading.classList.remove('hidden');
  linkCard.classList.add('hidden');
  skeletonCard.classList.remove('hidden');
  skeletonCard.classList.add('flex');
}

// Hide skeleton loading state
function hideSkeleton() {
  queueCount.classList.remove('hidden');
  skeletonLoading.classList.add('hidden');
  skeletonCard.classList.add('hidden');
  skeletonCard.classList.remove('flex');
}

// Load auth state from storage
async function loadAuthState() {
  const result = await chrome.storage.local.get(['user', 'authToken']);
  if (result.user && result.authToken) {
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
  productivityMode = result.productivityMode || true;
}

// Update toggle UI
function updateToggle() {
  if (productivityMode) {
    productivityToggle.classList.add('active');
  } else {
    productivityToggle.classList.remove('active');
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
  if (isAnimating) return;

  currentLink = getRandomLink();

  if (!currentLink) {
    // No links in queue
    linkCard.style.display = 'none';
    emptyState.style.display = 'block';
    openBtn.disabled = true;
    skipBtn.disabled = true;
    deleteBtn.disabled = true;
    return;
  }

  // Set animation flag to prevent clicks
  isAnimating = true;

  // Animate out old content first
  linkTitle.classList.add('link-exit');
  linkUrl.classList.add('link-exit');
  const linkFavicon = document.getElementById('linkFavicon');
  if (linkFavicon) {
    linkFavicon.classList.add('link-exit');
  }

  // Wait for exit animation to complete (150ms)
  setTimeout(() => {
    // Show the link
    linkCard.style.display = 'flex';
    emptyState.style.display = 'none';
    linkTitle.textContent = currentLink.title;

    // Update URL with simplified domain
    const domain = simplifyUrl(currentLink.url);
    linkUrl.textContent = domain;

    // Update favicon with preloading to prevent layout shift
    const faviconUrl = getFaviconUrl(currentLink.url);
    if (faviconUrl && linkFavicon) {
      // Preload favicon before showing it
      const img = new Image();
      img.src = faviconUrl;
      img.onload = () => {
        linkFavicon.src = faviconUrl;
        linkFavicon.classList.remove('hidden');
      };
      img.onerror = () => {
        linkFavicon.classList.add('hidden');
      };
    } else if (linkFavicon) {
      linkFavicon.classList.add('hidden');
    }

    // Remove exit classes and add enter classes
    linkTitle.classList.remove('link-exit');
    linkUrl.classList.remove('link-exit');
    linkTitle.classList.add('link-enter');
    linkUrl.classList.add('link-enter');

    if (linkFavicon && !linkFavicon.classList.contains('hidden')) {
      linkFavicon.classList.remove('link-exit');
      linkFavicon.classList.add('link-enter');
    }

    // Clean up animation classes after animation completes (150ms)
    setTimeout(() => {
      linkTitle.classList.remove('link-enter');
      linkUrl.classList.remove('link-enter');
      if (linkFavicon) {
        linkFavicon.classList.remove('link-enter');
      }

      // Clear animation flag
      isAnimating = false;
    }, 150);
  }, 150);
}

// Update queue count display with stats
function updateQueueCount() {
  if (queue.length === 0) {
    statsRemaining.textContent = 'No links saved';
    statsTime.textContent = '';
    return;
  }

  const remaining = queue.length;
  statsRemaining.textContent = `${remaining} ${remaining !== 1 ? 'links' : 'link'}`;

  // Update time if we have a current link
  if (currentLink) {
    const timeAgo = getTimeAgo(currentLink.timestamp);
    statsTime.textContent = `saved ${timeAgo}`;
  } else {
    statsTime.textContent = 'saved N/A';
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

    updateQueueCount();
    displayRandomLink();
  } catch (error) {
    if (error.message === 'DUPLICATE') {
    } else {
      console.error('Failed to save link:', error);
    }
  }
}

// Delete a link from the queue
async function deleteLink(id) {
  // Require authentication
  if (!currentUser || !currentUser.uid) {
    console.error('User not authenticated - cannot delete link');
    return;
  }

  try {
    // Delete from Firestore
    await deleteLinkFromFirestore(currentUser.uid, id);

    // Remove from local queue array for immediate UI update
    queue = queue.filter(link => link.id !== id);

    // Remove from skipped list if present
    skippedLinks = skippedLinks.filter(skippedId => skippedId !== id);

    updateQueueCount();
  } catch (error) {
    console.error('Failed to delete link from Firestore:', error);
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
