import { db, signInWithStoredToken } from './firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

// Global state
let currentLink = null;
let queue = [];
let productivityMode = false;
let currentUser = null;

// DOM elements
const linkCard = document.getElementById('linkCard');
const linkTitle = document.getElementById('linkTitle');
const linkUrl = document.getElementById('linkUrl');
const emptyState = document.getElementById('emptyState');
const queueCount = document.getElementById('queueCount');
const openBtn = document.getElementById('openBtn');
const skipBtn = document.getElementById('skipBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveCurrentBtn = document.getElementById('saveCurrentBtn');
const productivityToggle = document.getElementById('productivityToggle');

// Auth elements
const signedOutDiv = document.getElementById('signedOut');
const signedInDiv = document.getElementById('signedIn');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// Auth website URL
const AUTH_URL = 'https://484-final-project-three.vercel.app/';

// Initialize popup
async function init() {
  await loadAuthState();

  // Sign in to Firebase Auth if we have a stored token
  if (currentUser) {
    await signInWithStoredToken();
  }

  await loadQueue();
  await loadProductivityMode();
  displayRandomLink();
  updateQueueCount();
  updateToggle();
  updateAuthUI();
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
    signedOutDiv.style.display = 'none';
    signedInDiv.style.display = 'block';
    userName.textContent = currentUser.displayName || 'User';
    userEmail.textContent = currentUser.email || '';
    userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/32';
  } else {
    // Signed out
    signedOutDiv.style.display = 'block';
    signedInDiv.style.display = 'none';
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
      loadAuthState().then(async () => {
        updateAuthUI();
        // Reload queue from Firestore when user signs in
        await loadQueue();
        updateQueueCount();
        displayRandomLink();
        chrome.storage.onChanged.removeListener(authListener);
      });
    }
  });
}

// Handle sign out
async function handleSignOut() {
  await chrome.storage.local.remove(['user', 'authToken', 'authTimestamp']);
  currentUser = null;
  queue = []; // Clear queue on sign out
  updateAuthUI();
  updateQueueCount();
  displayRandomLink();
}

// Load queue from storage
async function loadQueue() {
  // Require authentication to load queue
  if (!currentUser || !currentUser.uid) {
    console.log('User not authenticated - cannot load queue');
    queue = [];
    return;
  }

  try {
    // Load all links from Firestore for the current user
    const linksRef = collection(db, 'users', currentUser.uid, 'links');
    const querySnapshot = await getDocs(linksRef);

    queue = [];
    querySnapshot.forEach((doc) => {
      queue.push({
        id: doc.id, // Use Firestore document ID
        url: doc.data().url,
        title: doc.data().title,
        timestamp: doc.data().timestamp
      });
    });

    console.log(`Loaded ${queue.length} links from Firestore`);
  } catch (error) {
    console.error('Failed to load queue from Firestore:', error);
    queue = [];
  }
}

// Removed saveQueue - no longer needed since we write directly to Firestore

// Load productivity mode from storage
async function loadProductivityMode() {
  const result = await chrome.storage.local.get(['productivityMode']);
  productivityMode = result.productivityMode || false;
}

// Update toggle UI
function updateToggle() {
  if (productivityMode) {
    productivityToggle.classList.add('active');
  } else {
    productivityToggle.classList.remove('active');
  }
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
    // No links in queue
    linkCard.style.display = 'none';
    emptyState.style.display = 'block';
    openBtn.disabled = true;
    skipBtn.disabled = true;
    deleteBtn.disabled = true;
    return;
  }

  // Show the link
  linkCard.style.display = 'block';
  emptyState.style.display = 'none';
  linkTitle.textContent = currentLink.title || 'Untitled';
  linkUrl.textContent = currentLink.url;
  openBtn.disabled = false;
  skipBtn.disabled = false;
  deleteBtn.disabled = false;
}

// Update queue count display
function updateQueueCount() {
  queueCount.textContent = `${queue.length} link${queue.length !== 1 ? 's' : ''} in queue`;
}

// Save a new link to the queue
async function saveLink(url, title) {
  // Require authentication
  if (!currentUser || !currentUser.uid) {
    alert('Please sign in to save links!');
    return;
  }

  try {
    // Check for duplicates in Firestore
    const linksRef = collection(db, 'users', currentUser.uid, 'links');
    const q = query(linksRef, where('url', '==', url));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      alert('This link is already in your queue!');
      return;
    }

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'links'), {
      url: url,
      title: title || url,
      timestamp: Date.now(),
      createdAt: Date.now()
    });

    // Add to local queue array for immediate UI update
    queue.push({
      id: docRef.id,
      url: url,
      title: title || url,
      timestamp: Date.now()
    });

    updateQueueCount();
    displayRandomLink();
    alert('Page saved!');
  } catch (error) {
    console.error('Failed to save link:', error);
    alert('Failed to save link. Please try again.');
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
    await deleteDoc(doc(db, 'users', currentUser.uid, 'links', id));
    console.log('Link deleted from Firestore:', id);

    // Remove from local queue array for immediate UI update
    queue = queue.filter(link => link.id !== id);
    updateQueueCount();
    displayRandomLink();
  } catch (error) {
    console.error('Failed to delete link from Firestore:', error);
    alert('Failed to delete link. Please try again.');
  }
}

// Open link in new tab and remove from queue
async function openAndRemove(id) {
  const link = queue.find(l => l.id === id);
  if (link) {
    // Open in new tab
    chrome.tabs.create({ url: link.url });
    // Remove from queue
    await deleteLink(id);
  }
}

// Button event listeners
openBtn.addEventListener('click', async () => {
  if (currentLink) {
    await openAndRemove(currentLink.id);
  }
});

skipBtn.addEventListener('click', () => {
  // Just show another random link (current one stays in queue)
  displayRandomLink();
});

deleteBtn.addEventListener('click', async () => {
  if (currentLink) {
    await deleteLink(currentLink.id);
  }
});

saveCurrentBtn.addEventListener('click', async () => {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await saveLink(tab.url, tab.title);
    alert('Page saved!');
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
signOutBtn.addEventListener('click', handleSignOut);

// Initialize when popup opens
init();
