import { WEBSITE_URL, buildAuthUrl } from './config.js';

// Global state
let currentLink = null;
let queue = [];
let currentUser = null;
let operationInProgress = false;

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

// Send message to background script
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

// Initialize popup UI and load data
async function init() {
  try {
    let authState = await getAuthState();

    // Retry once if auth not ready
    if (!authState.authenticated) {
      await new Promise(resolve => setTimeout(resolve, 300));
      authState = await getAuthState();
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
  if (queue.length === 0) {
    queueCount.classList.add('hidden');
    return;
  }

  queueCount.classList.remove('hidden');

  const remaining = queue.length;
  statsRemaining.textContent = `${remaining} ${remaining !== 1 ? 'links' : 'link'}`;

  if (currentLink) {
    const timeAgo = getTimeAgo(currentLink.createdAt);
    statsTime.textContent = `${timeAgo}`;
  } else {
    statsTime.textContent = '0m Ago';
  }
}

// Save link to Firestore
async function handleSaveLink(url, title) {
  if (!currentUser) {
    return;
  }

  try {
    const response = await saveLink(url, title);
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

// Initialize popup
init();
