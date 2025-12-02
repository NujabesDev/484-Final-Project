import './popup.css';
import { WEBSITE_URL, buildAuthUrl } from './config.js';

// Global state
let currentLink = null;
let queue = [];
let currentUser = null;
let operationInProgress = false;
let productivityMode = false;

// Format timestamp to relative time (e.g., "2d ago")
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

// Extract domain from URL without www prefix
function simplifyUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}

// Get favicon URL for domain
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return '';
  }
}

// Send message to background script with timeout
function sendMessage(action, data = {}) {
  return new Promise((resolve, reject) => {
    // Add 5-second timeout to prevent hung UI if service worker dies
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout - please try again'));
    }, 5000);

    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      clearTimeout(timeoutId); // Clear timeout on response

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

async function saveLink(url, title, timeEstimate = null) {
  const response = await sendMessage('SAVE_LINK', { url, title, timeEstimate });
  return response;
}

async function deleteLink(linkId) {
  const response = await sendMessage('DELETE_LINK', { linkId });
  return response;
}

async function getProductivityMode() {
  const response = await sendMessage('GET_PRODUCTIVITY_MODE');
  return response;
}

async function setProductivityMode(enabled) {
  const response = await sendMessage('SET_PRODUCTIVITY_MODE', { enabled });
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
const productivityToggle = document.getElementById('productivityToggle');

// Initialize popup UI and load data
async function init() {
  try {
    let authState = await getAuthState();

    // If not authenticated, retry up to 3 times with exponential backoff
    // This handles service worker restarts where Firebase needs time to restore from IndexedDB
    if (!authState.authenticated) {
      const retryDelays = [100, 300, 500]; // Progressive delays: 100ms, 300ms, 500ms

      for (const delay of retryDelays) {
        await new Promise(resolve => setTimeout(resolve, delay));
        authState = await getAuthState();

        if (authState.authenticated) {
          break; // Auth restored - stop retrying
        }
      }
    }

    currentUser = authState.user;
    updateAuthUI();

    if (!currentUser) {
      queue = [];
      displayRandomLink();
      return;
    }

    const linksResponse = await getLinks();

    if (linksResponse.links) {
      queue = linksResponse.links;
    }

    displayRandomLink();

    // Load productivity mode state
    const modeResponse = await getProductivityMode();
    if (modeResponse.success) {
      productivityMode = modeResponse.enabled;
      updateProductivityToggleUI();
    }
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showErrorMessage('Failed to load - please try again');
  }
}

// Update UI based on authentication state
function updateAuthUI() {
  if (currentUser) {
    // Show authenticated UI
    signedOutDiv.classList.add('hidden');
    signedInDiv.classList.remove('hidden');
    userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/32';

    mainHeader?.classList.remove('hidden');
    saveSection?.classList.remove('hidden');

    mainContainer?.classList.remove('justify-center', 'items-center');
    authSection?.classList.add('border-t', 'border-[#1a1a1a]', 'mt-auto');
  } else {
    // Show unauthenticated UI
    signedOutDiv.classList.remove('hidden');
    signedInDiv.classList.add('hidden');

    mainHeader?.classList.add('hidden');
    saveSection?.classList.add('hidden');
    actionButtons.classList.add('hidden');
    linkCard.classList.add('hidden');
    queueCount.classList.add('hidden');

    mainContainer?.classList.add('justify-center', 'items-center');
    authSection?.classList.remove('border-t', 'border-[#1a1a1a]', 'mt-auto');
  }
}

// Open authentication page
async function handleSignIn() {
  chrome.tabs.create({ url: buildAuthUrl() });
}

// Open dashboard in new tab
function handleDashboard() {
  chrome.tabs.create({ url: WEBSITE_URL });
}

// Enable or disable action buttons based on queue
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

// Display random link or empty state
function displayRandomLink() {
  if (!currentUser) {
    return;
  }

  currentLink = getRandomLink();

  if (!currentLink) {
    // Show empty state
    linkCard.classList.remove('hidden');
    actionButtons.classList.remove('hidden');
    if (linkFavicon) {
      linkFavicon.classList.add('invisible');
    }
    linkTitle.textContent = 'Your queue is empty';
    linkUrl.textContent = 'Save a link below!';
    updateButtonStates();
    updateQueueCount(); // Update stats to hide when empty
    return;
  }

  // Update link content
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

  linkCard.classList.remove('hidden');
  actionButtons.classList.remove('hidden');

  updateButtonStates();
  updateQueueCount();
}

// Display error message temporarily
function showErrorMessage(message) {
  linkTitle.textContent = message;
  linkUrl.textContent = '';
  linkTitle.style.color = '#ef4444';

  setTimeout(() => {
    linkTitle.style.color = '';
    if (queue.length === 0) {
      linkTitle.textContent = 'Your queue is empty';
      linkUrl.textContent = 'Save a link below!';
    } else if (currentLink) {
      linkTitle.textContent = currentLink.title;
      linkUrl.textContent = simplifyUrl(currentLink.url);
    }
  }, 2000);
}

// Update queue stats display
function updateQueueCount() {
  // Always show stats bar to prevent layout shift
  queueCount.classList.remove('hidden');

  if (queue.length === 0) {
    // Show placeholder values when empty
    statsRemaining.textContent = '0 links';
    statsTime.textContent = '0m ago';
    return;
  }

  const remaining = queue.length;
  statsRemaining.textContent = `${remaining} ${remaining !== 1 ? 'links' : 'link'}`;

  if (currentLink) {
    const timeAgo = getTimeAgo(currentLink.createdAt);
    statsTime.textContent = `${timeAgo}`;
  } else {
    statsTime.textContent = '0m ago';
  }
}

// Parse duration string (e.g., "10:23" or "1:05:30") to seconds
function parseDuration(durationStr) {
  const cleaned = durationStr.replace(/[^\d:]/g, '');
  const parts = cleaned.split(':').filter(p => p.length > 0).reverse();

  if (parts.length === 0) return 0;

  let seconds = 0;
  for (let i = 0; i < parts.length; i++) {
    const num = parseInt(parts[i], 10);
    if (isNaN(num)) continue;
    seconds += num * Math.pow(60, i);
  }

  return seconds;
}

// Extract YouTube duration from active tab
async function extractYouTubeDuration(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Try multiple selectors for YouTube duration
        const selectors = [
          'ytd-thumbnail-overlay-time-status-renderer #text',
          '.ytd-thumbnail-overlay-time-status-renderer',
          '#time-status',
          'span.ytd-thumbnail-overlay-time-status-renderer',
          '.ytp-time-duration',
          // For video watch page
          '.ytp-time-duration',
          'span.ytp-time-duration'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            return element.textContent.trim();
          }
        }

        // Try getting duration from video player
        const video = document.querySelector('video');
        if (video && video.duration && !isNaN(video.duration)) {
          const totalSeconds = Math.floor(video.duration);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
        }

        return null;
      }
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
  } catch (error) {
    console.error('Failed to extract YouTube duration:', error);
  }
  return null;
}

// Calculate time estimate for a URL (smart platform-based defaults)
async function calculateTimeEstimate(url, title, tab = null) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // YouTube videos - try to extract real duration from page
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      // Check for Shorts
      if (url.includes('/shorts/')) {
        return 60; // YouTube Shorts are max 60 seconds
      }

      // Try to extract real duration from the page
      if (tab) {
        const durationStr = await extractYouTubeDuration(tab);
        if (durationStr) {
          const seconds = parseDuration(durationStr);
          if (seconds > 0) {
            console.log('Extracted YouTube duration:', durationStr, '→', seconds, 'seconds');
            return seconds;
          }
        }
      }

      // Fallback: Use title length as rough estimate
      const titleLength = title.length;
      if (titleLength < 30) {
        return 300; // 5 minutes
      } else if (titleLength < 60) {
        return 600; // 10 minutes
      } else {
        return 900; // 15 minutes
      }
    }

    // TikTok videos
    if (hostname.includes('tiktok.com')) {
      return 45; // TikTok videos average 30-60 seconds
    }

    // Instagram
    if (hostname.includes('instagram.com')) {
      if (url.includes('/reel/')) {
        return 30; // Reels are short
      } else {
        return 20; // Image posts with captions
      }
    }

    // Reddit
    if (hostname.includes('reddit.com') && url.includes('/comments/')) {
      // Check for video indicators in URL
      if (url.includes('v.redd.it') || url.includes('/video/')) {
        return 480; // Average Reddit video ~8 minutes
      }
      // Text post - use title length as proxy
      const titleLength = title.length;
      if (titleLength < 50) {
        return 60; // Short post
      } else if (titleLength < 100) {
        return 120; // Medium post
      } else {
        return 180; // Long post
      }
    }

    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      if (url.includes('/status/')) {
        return 30; // Tweets are quick to read
      }
    }

    // Fallback default
    return 120; // 2 minutes default
  } catch (e) {
    return 120; // 2 minutes default on error
  }
}

// Save link to Firestore
async function handleSaveLink(url, title, tab = null) {
  if (!currentUser) {
    return;
  }

  try {
    // Calculate time estimate for the URL (pass tab for YouTube duration extraction)
    const timeEstimate = await calculateTimeEstimate(url, title, tab);

    const response = await saveLink(url, title, timeEstimate);
    queue.push(response.link);
    displayRandomLink();
  } catch (error) {
    if (error.message.includes('already exists')) {
      showErrorMessage('Link already saved!');
    } else {
      showErrorMessage('Failed to save link');
    }
  }
}

// Delete link from Firestore
async function handleDeleteLink(linkId) {
  if (!currentUser) {
    return;
  }

  try {
    await deleteLink(linkId);
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

// Open button: opens link and removes it
openBtn.addEventListener('click', async () => {
  if (openBtn.disabled) {
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
    updateButtonStates();
  }
});

// Skip button: shows different random link
skipBtn.addEventListener('click', () => {
  if (skipBtn.disabled) {
    showErrorMessage('Your queue is empty');
    return;
  }
  displayRandomLink();
});

// Delete button: removes current link
deleteBtn.addEventListener('click', async () => {
  if (deleteBtn.disabled) {
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
    updateButtonStates();
  }
});

// Save current page button
saveCurrentBtn.addEventListener('click', async () => {
  if (operationInProgress) return;

  operationInProgress = true;
  saveCurrentBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Pass tab object so we can extract YouTube duration from the page
      await handleSaveLink(tab.url, tab.title, tab);
    }
  } finally {
    operationInProgress = false;
    saveCurrentBtn.disabled = false;
  }
});

// Update productivity toggle UI
function updateProductivityToggleUI() {
  if (!productivityToggle) return;

  const pill = productivityToggle.querySelector('div');

  if (productivityMode) {
    // ON state: green background, pill slides right
    productivityToggle.style.backgroundColor = '#10b981';
    productivityToggle.style.borderColor = '#059669';
    if (pill) {
      pill.style.transform = 'translateX(22px)';
      pill.style.backgroundColor = 'white';
    }
  } else {
    // OFF state: dark background, pill on left
    productivityToggle.style.backgroundColor = '#262626';
    productivityToggle.style.borderColor = '#1a1a1a';
    if (pill) {
      pill.style.transform = 'translateX(0)';
      pill.style.backgroundColor = 'black';
    }
  }
}

// Handle productivity toggle click
async function handleProductivityToggle() {
  productivityMode = !productivityMode;
  updateProductivityToggleUI();

  try {
    await setProductivityMode(productivityMode);
  } catch (error) {
    console.error('Failed to update productivity mode:', error);
    // Revert on failure
    productivityMode = !productivityMode;
    updateProductivityToggleUI();
  }
}

// Auth button listeners
signInBtn.addEventListener('click', handleSignIn);
dashboardBtn.addEventListener('click', handleDashboard);

// Productivity toggle listener
if (productivityToggle) {
  productivityToggle.addEventListener('click', handleProductivityToggle);
}

// Initialize popup
init();
