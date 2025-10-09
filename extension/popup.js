// Global state
let currentLink = null;
let queue = [];
let productivityMode = false;

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

// Initialize popup
async function init() {
  await loadQueue();
  await loadProductivityMode();
  displayRandomLink();
  updateQueueCount();
  updateToggle();
}

// Load queue from storage
async function loadQueue() {
  const result = await chrome.storage.local.get(['queue']);
  queue = result.queue || [];
}

// Save queue to storage
async function saveQueue() {
  await chrome.storage.local.set({ queue });
}

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
  const newLink = {
    id: Date.now().toString(),
    url: url,
    title: title || url,
    timestamp: Date.now()
  };

  // Check for duplicates
  const isDuplicate = queue.some(link => link.url === url);
  if (isDuplicate) {
    alert('This link is already in your queue!');
    return;
  }

  queue.push(newLink);
  await saveQueue();
  updateQueueCount();
  displayRandomLink();
}

// Delete a link from the queue
async function deleteLink(id) {
  queue = queue.filter(link => link.id !== id);
  await saveQueue();
  updateQueueCount();
  displayRandomLink();
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

// Initialize when popup opens
init();
