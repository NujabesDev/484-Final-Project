import { WEBSITE_URL, buildAuthUrl } from './config.js';

// Global state
let currentLink = null;
let queue = [];
let currentUser = null; // Track auth state locally
let operationInProgress = false; // Prevent concurrent operations

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

// Message passing helper functions
function sendMessage(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response && !response.success) {
        reject(new Error(response.error || 'Unknown error'));
        return;
      }

      resolve(response);
    });
  });
}

async function getAuthState() {
  const response = await sendMessage('GET_AUTH_STATE');
  return response;
}

async function getLinks() {
  const response = await sendMessage('GET_LINKS');
  return response;
}

async function saveLink(url, title) {
  const response = await sendMessage('SAVE_LINK', { url, title });
  return response;
}

async function deleteLink(linkId) {
  const response = await sendMessage('DELETE_LINK', { linkId });
  return response;
}

// DOM elements
const mainContainer = document.getElementById('mainContainer');
const authSection = document.getElementById('authSection');
const mainHeader = document.getElementById('mainHeader');
const saveSection = document.getElementById('saveSection');
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
  try {
    // Get auth state from background
    let authState = await getAuthState();

    // If not authenticated, retry once after a short delay
    // (Firebase auth might still be initializing in background)
    if (!authState.authenticated) {
      await new Promise(resolve => setTimeout(resolve, 300));
      authState = await getAuthState();
    }

    currentUser = authState.user;

    updateAuthUI();

    if (!currentUser) {
      // Not authenticated - clear and return
      queue = [];
      displayRandomLink();
      return;
    }

    // Get links from background (cache is always fresh via real-time sync!)
    const linksResponse = await getLinks();

    if (linksResponse.links) {
      queue = linksResponse.links;
    }

    // Always call displayRandomLink to show UI (empty state or link)
    displayRandomLink();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showErrorMessage('Failed to load - please try again');
  }
}

// Note: No manual sync needed - real-time listener in background.js
// automatically updates cache when Firestore changes!

// Update auth UI based on current user state
function updateAuthUI() {
  if (currentUser) {
    // Signed in - show auth buttons and main UI elements
    signedOutDiv.classList.add('hidden');
    signedInDiv.classList.remove('hidden');
    userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/32';

    // Show main UI elements (link card and action buttons visibility handled by displayRandomLink)
    mainHeader?.classList.remove('hidden');
    saveSection?.classList.remove('hidden');

    // Remove centering and add back normal layout
    mainContainer?.classList.remove('justify-center', 'items-center');
    authSection?.classList.add('border-t', 'border-[#1a1a1a]', 'mt-auto');
  } else {
    // Signed out - hide everything except sign-in button
    signedOutDiv.classList.remove('hidden');
    signedInDiv.classList.add('hidden');

    // Hide ALL main UI elements when not authenticated
    mainHeader?.classList.add('hidden');
    saveSection?.classList.add('hidden');
    actionButtons.classList.add('hidden');
    linkCard.classList.add('hidden');
    queueCount.classList.add('hidden');

    // Center the sign-in button
    mainContainer?.classList.add('justify-center', 'items-center');
    authSection?.classList.remove('border-t', 'border-[#1a1a1a]', 'mt-auto');
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
  // Don't show any links if user is not authenticated
  if (!currentUser) {
    return;
  }

  currentLink = getRandomLink();

  if (!currentLink) {
    // No links in queue - show empty state with visible but disabled buttons
    linkCard.classList.remove('hidden');
    actionButtons.classList.remove('hidden'); // Keep buttons visible
    if (linkFavicon) {
      linkFavicon.classList.add('invisible');
    }
    linkTitle.textContent = 'Your queue is empty';
    linkUrl.textContent = 'Save a link below!';
    updateButtonStates(); // Buttons will be disabled but visible
    return;
  }

  // Update content - CSS handles transitions
  linkTitle.textContent = currentLink.title;
  linkUrl.textContent = simplifyUrl(currentLink.url);

  // Update favicon
  const faviconUrl = getFaviconUrl(currentLink.url);
  if (faviconUrl && linkFavicon) {
    linkFavicon.src = faviconUrl;
    linkFavicon.onerror = () => linkFavicon.classList.add('invisible');
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

// Save a new link via message to background
async function handleSaveLink(url, title) {
  if (!currentUser) {
    return;
  }

  try {
    // Send save message to background (background handles Firestore + cache)
    const response = await saveLink(url, title);

    // Add to local queue for immediate UI update
    queue.push(response.link);
    displayRandomLink();
  } catch (error) {
    // Show error message to user
    if (error.message.includes('already exists')) {
      showErrorMessage('Link already saved!');
    } else {
      showErrorMessage('Failed to save link');
    }
  }
}

// Delete a link via message to background
async function handleDeleteLink(linkId) {
  if (!currentUser) {
    return;
  }

  try {
    // Send delete message to background (background handles Firestore + cache)
    await deleteLink(linkId);

    // Remove from local queue for immediate UI update
    queue = queue.filter(link => link.id !== linkId);
  } catch (error) {
    showErrorMessage('Failed to delete link');
  }
}

// Open link in new tab and remove from queue
async function openAndRemove(linkId) {
  const link = queue.find(l => l.id === linkId);
  if (link) {
    chrome.tabs.create({ url: link.url });
    await handleDeleteLink(linkId);
  }
}

// Button event listeners
openBtn.addEventListener('click', async () => {
  if (openBtn.disabled) {
    // Show empty state message when clicking disabled button
    showErrorMessage('Your queue is empty');
    return;
  }

  if (operationInProgress) return;

  operationInProgress = true;
  openBtn.disabled = true;

  try {
    if (currentLink) {
      await openAndRemove(currentLink.id);
      displayRandomLink();
    }
  } finally {
    operationInProgress = false;
    // Re-enable button based on queue state
    updateButtonStates();
  }
});

skipBtn.addEventListener('click', () => {
  if (skipBtn.disabled) {
    // Show empty state message when clicking disabled button
    showErrorMessage('Your queue is empty');
    return;
  }
  // Just show a different random link
  displayRandomLink();
});

deleteBtn.addEventListener('click', async () => {
  if (deleteBtn.disabled) {
    // Show empty state message when clicking disabled button
    showErrorMessage('Your queue is empty');
    return;
  }

  if (operationInProgress) return;

  operationInProgress = true;
  deleteBtn.disabled = true;

  try {
    if (currentLink) {
      await handleDeleteLink(currentLink.id);
      displayRandomLink();
    }
  } finally {
    operationInProgress = false;
    // Re-enable button based on queue state
    updateButtonStates();
  }
});

saveCurrentBtn.addEventListener('click', async () => {
  if (operationInProgress) return;

  operationInProgress = true;
  saveCurrentBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await handleSaveLink(tab.url, tab.title);
    }
  } finally {
    operationInProgress = false;
    saveCurrentBtn.disabled = false;
  }
});

// Auth button listeners
signInBtn.addEventListener('click', handleSignIn);
dashboardBtn.addEventListener('click', handleDashboard);

// Initialize when popup opens
init();
