// Content script for intercepting Reddit posts and YouTube videos in Productivity Mode

// Cache productivity mode state for synchronous access
let productivityModeEnabled = false;

// Initialize and listen for productivity mode changes
chrome.storage.local.get('productivityMode').then(result => {
  productivityModeEnabled = result.productivityMode || false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.productivityMode) {
    productivityModeEnabled = changes.productivityMode.newValue || false;
  }
});

// Add notification styles once
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
`;
document.head.appendChild(style);

// Show toast notification
function showNotification(message, type = 'success') {
  // Remove existing notification if present
  const existing = document.getElementById('read-later-notification');
  if (existing) {
    existing.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'read-later-notification';
  notification.textContent = message;

  // Style based on type
  const bgColors = {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColors[type] || bgColors.success};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;

  // Add to page
  document.body.appendChild(notification);

  // Auto-dismiss after 2.5 seconds
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// Check if URL is a Reddit post
function isRedditPostUrl(url) {
  try {
    const urlObj = new URL(url);
    // Check if URL contains /comments/ (Reddit post pattern)
    return urlObj.pathname.includes('/comments/');
  } catch (e) {
    return false;
  }
}

// Check if URL is a YouTube video
function isYouTubeVideoUrl(url) {
  try {
    const urlObj = new URL(url);
    // Check for youtube.com/watch or youtu.be/ patterns
    return (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/watch')) ||
           urlObj.hostname.includes('youtu.be');
  } catch (e) {
    return false;
  }
}

// Extract post title from Reddit link element
function extractPostTitle(element) {
  // Try to find title text in the clicked element or its parent
  let titleElement = element;

  // Search up the DOM tree for title text
  for (let i = 0; i < 5; i++) {
    if (!titleElement) break;

    // Check for common Reddit title selectors
    const possibleTitle = titleElement.querySelector('[data-click-id="body"]') ||
                         titleElement.querySelector('h3') ||
                         titleElement.querySelector('[slot="title"]');

    if (possibleTitle && possibleTitle.textContent.trim()) {
      return possibleTitle.textContent.trim();
    }

    titleElement = titleElement.parentElement;
  }

  // Fallback: use link text if available
  return element.textContent.trim() || 'Reddit Post';
}

// Extract video title from YouTube link element
function extractYouTubeTitle(element) {
  // Try aria-label first (most reliable for YouTube)
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim();
  }

  // Try to find title in parent container
  let titleElement = element;
  for (let i = 0; i < 5; i++) {
    if (!titleElement) break;

    // Check for YouTube title selectors
    const possibleTitle = titleElement.querySelector('#video-title') ||
                         titleElement.querySelector('h3') ||
                         titleElement.querySelector('.title');

    if (possibleTitle && possibleTitle.textContent.trim()) {
      return possibleTitle.textContent.trim();
    }

    titleElement = titleElement.parentElement;
  }

  // Fallback: use link text or default
  return element.textContent.trim() || 'YouTube Video';
}

// Handle link click
async function handleClick(event) {
  const target = event.target.closest('a');
  if (!target || !target.href) return;

  // Check if this is a Reddit post or YouTube video
  const isReddit = isRedditPostUrl(target.href);
  const isYouTube = isYouTubeVideoUrl(target.href);

  // Only proceed if it's a supported link type
  if (!isReddit && !isYouTube) return;

  // Check if productivity mode is enabled (synchronous check!)
  if (!productivityModeEnabled) return;

  // ✅ Prevent navigation IMMEDIATELY (before any async operations)
  event.preventDefault();
  event.stopPropagation();

  // Extract title and URL based on platform
  const url = target.href;
  const title = isReddit ? extractPostTitle(target) : extractYouTubeTitle(target);

  try {
    // Send to background script - it handles all validation and duplicate checking
    const response = await chrome.runtime.sendMessage({
      action: 'SAVE_LINK',
      url: url,
      title: title
    });

    // Show appropriate notification based on response
    if (response.success) {
      showNotification('Saved for later!', 'success');
    } else if (response.error?.includes('already exists')) {
      showNotification('Already saved!', 'warning');
    } else if (response.error?.includes('authenticated')) {
      showNotification('Sign in to save links', 'error');
    } else {
      showNotification('Failed to save', 'error');
    }
  } catch (error) {
    console.error('Failed to save link:', error);
    showNotification('Extension error', 'error');
  }
}

// Listen for all clicks on the page
document.addEventListener('click', handleClick, true);
