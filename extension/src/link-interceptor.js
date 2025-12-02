// Content script for intercepting social media links in Productivity Mode
// Supports: Reddit, YouTube, Twitter/X, TikTok, Instagram

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

// Check if URL is a Twitter/X post
function isTwitterPostUrl(url) {
  try {
    const urlObj = new URL(url);
    // Check for twitter.com or x.com with /status/ pattern
    return (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) &&
           urlObj.pathname.includes('/status/');
  } catch (e) {
    return false;
  }
}

// Check if URL is a TikTok video
function isTikTokVideoUrl(url) {
  try {
    const urlObj = new URL(url);
    // Check for tiktok.com with /video/ pattern or vm.tiktok.com
    return (urlObj.hostname.includes('tiktok.com') &&
           (urlObj.pathname.includes('/video/') || urlObj.pathname.includes('/@'))) ||
           urlObj.hostname.includes('vm.tiktok.com');
  } catch (e) {
    return false;
  }
}

// Check if URL is an Instagram post
function isInstagramPostUrl(url) {
  try {
    const urlObj = new URL(url);
    // Check for instagram.com with /p/ (post) or /reel/ pattern
    return urlObj.hostname.includes('instagram.com') &&
           (urlObj.pathname.includes('/p/') || urlObj.pathname.includes('/reel/'));
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

// Extract tweet text from Twitter/X link element
function extractTwitterTitle(element) {
  // Try aria-label first
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim();
  }

  // Try to find tweet text in parent container
  let titleElement = element;
  for (let i = 0; i < 8; i++) {
    if (!titleElement) break;

    // Check for Twitter tweet text selectors
    const possibleTitle = titleElement.querySelector('[data-testid="tweetText"]') ||
                         titleElement.querySelector('.css-1rynq56') ||
                         titleElement.querySelector('[lang]');

    if (possibleTitle && possibleTitle.textContent.trim()) {
      const text = possibleTitle.textContent.trim();
      // Truncate if too long
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }

    titleElement = titleElement.parentElement;
  }

  // Fallback: use link text or default
  return element.textContent.trim() || 'Twitter Post';
}

// Extract video title from TikTok link element
function extractTikTokTitle(element) {
  // Try aria-label first
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim();
  }

  // Try to find title in parent container
  let titleElement = element;
  for (let i = 0; i < 8; i++) {
    if (!titleElement) break;

    // Check for TikTok title/caption selectors
    const possibleTitle = titleElement.querySelector('[class*="DivContainer"]') ||
                         titleElement.querySelector('h1') ||
                         titleElement.querySelector('[class*="title"]');

    if (possibleTitle && possibleTitle.textContent.trim()) {
      const text = possibleTitle.textContent.trim();
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }

    titleElement = titleElement.parentElement;
  }

  // Fallback: use link text or default
  return element.textContent.trim() || 'TikTok Video';
}

// Extract caption from Instagram link element
function extractInstagramTitle(element) {
  // Try aria-label first (often has good caption info)
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim();
  }

  // Try to find caption in parent container
  let titleElement = element;
  for (let i = 0; i < 8; i++) {
    if (!titleElement) break;

    // Check for Instagram caption/title selectors
    const possibleTitle = titleElement.querySelector('h1') ||
                         titleElement.querySelector('h2') ||
                         titleElement.querySelector('[class*="Caption"]');

    if (possibleTitle && possibleTitle.textContent.trim()) {
      const text = possibleTitle.textContent.trim();
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }

    titleElement = titleElement.parentElement;
  }

  // Fallback: use link text or default
  return element.textContent.trim() || 'Instagram Post';
}

// Handle link click
async function handleClick(event) {
  const target = event.target.closest('a');
  if (!target || !target.href) return;

  // Check if this is a supported platform link
  const isReddit = isRedditPostUrl(target.href);
  const isYouTube = isYouTubeVideoUrl(target.href);
  const isTwitter = isTwitterPostUrl(target.href);
  const isTikTok = isTikTokVideoUrl(target.href);
  const isInstagram = isInstagramPostUrl(target.href);

  // Only proceed if it's a supported link type
  if (!isReddit && !isYouTube && !isTwitter && !isTikTok && !isInstagram) return;

  // Check if productivity mode is enabled (synchronous check!)
  if (!productivityModeEnabled) return;

  // ✅ Prevent navigation IMMEDIATELY (before any async operations)
  event.preventDefault();
  event.stopPropagation();

  // Extract title and URL based on platform
  const url = target.href;
  let title;
  if (isReddit) {
    title = extractPostTitle(target);
  } else if (isYouTube) {
    title = extractYouTubeTitle(target);
  } else if (isTwitter) {
    title = extractTwitterTitle(target);
  } else if (isTikTok) {
    title = extractTikTokTitle(target);
  } else if (isInstagram) {
    title = extractInstagramTitle(target);
  }

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
