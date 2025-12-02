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

// Extract full Reddit post content for word count
function extractRedditFullText(element) {
  let textContent = '';
  let contentElement = element;

  for (let i = 0; i < 8; i++) {
    if (!contentElement) break;

    // Get title
    const title = contentElement.querySelector('h3') || contentElement.querySelector('[slot="title"]');
    if (title) {
      textContent += title.textContent.trim() + ' ';
    }

    // Get post body/selftext
    const body = contentElement.querySelector('[data-click-id="text"]') ||
                 contentElement.querySelector('.md') ||
                 contentElement.querySelector('[slot="text-body"]');
    if (body) {
      textContent += body.textContent.trim();
    }

    if (textContent) break;
    contentElement = contentElement.parentElement;
  }

  return textContent.trim();
}

// Check if Reddit post is a video and extract duration
function extractRedditVideoDuration(element) {
  let videoElement = element;

  for (let i = 0; i < 10; i++) {
    if (!videoElement) break;

    // Check for video duration indicators
    const duration = videoElement.querySelector('[class*="duration"]') ||
                     videoElement.querySelector('time') ||
                     videoElement.querySelector('[class*="video-duration"]');

    if (duration && duration.textContent.trim()) {
      const parsed = parseDuration(duration.textContent.trim());
      if (parsed > 0) {
        console.log('Reddit video duration found:', duration.textContent.trim(), '→', parsed, 'seconds');
        return parsed;
      }
    }

    videoElement = videoElement.parentElement;
  }

  return null; // No video duration found
}

// Check if a Reddit post is actually a video post
function isRedditVideoPost(element, url) {
  // Check if URL contains video indicators
  if (url.includes('v.redd.it') || url.includes('/video/')) {
    return true;
  }

  // Check DOM for video indicators
  let checkElement = element;
  for (let i = 0; i < 8; i++) {
    if (!checkElement) break;

    const hasVideo = checkElement.querySelector('video') ||
                     checkElement.querySelector('[data-click-id="video"]') ||
                     checkElement.querySelector('.video-player') ||
                     checkElement.querySelector('[class*="VideoPlayer"]');

    if (hasVideo) {
      return true;
    }

    checkElement = checkElement.parentElement;
  }

  return false;
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

// Extract YouTube video duration in seconds
function extractYouTubeDuration(element) {
  // Look for duration badge on thumbnail
  let durationElement = element;
  for (let i = 0; i < 10; i++) {
    if (!durationElement) break;

    // Try multiple selectors for YouTube duration
    const duration = durationElement.querySelector('ytd-thumbnail-overlay-time-status-renderer #text') ||
                     durationElement.querySelector('.ytd-thumbnail-overlay-time-status-renderer') ||
                     durationElement.querySelector('#time-status') ||
                     durationElement.querySelector('span.ytd-thumbnail-overlay-time-status-renderer') ||
                     durationElement.querySelector('.ytp-time-duration');

    if (duration && duration.textContent.trim()) {
      const parsed = parseDuration(duration.textContent.trim());
      if (parsed > 0) {
        console.log('YouTube duration found:', duration.textContent.trim(), '→', parsed, 'seconds');
        return parsed;
      }
    }

    durationElement = durationElement.parentElement;
  }

  console.log('No YouTube duration found, using default 10 minutes');
  // Default: assume 10 minutes if duration not found
  return 600;
}

// Parse duration string (e.g., "10:23" or "1:05:30") to seconds
function parseDuration(durationStr) {
  // Remove any non-numeric characters except colons
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

// Extract full tweet text for word count
function extractTwitterFullText(element) {
  let titleElement = element;
  for (let i = 0; i < 8; i++) {
    if (!titleElement) break;

    const tweetText = titleElement.querySelector('[data-testid="tweetText"]');
    if (tweetText && tweetText.textContent.trim()) {
      return tweetText.textContent.trim();
    }

    titleElement = titleElement.parentElement;
  }
  return '';
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

// Extract video ID from YouTube URL
function getYouTubeVideoId(url) {
  try {
    const urlObj = new URL(url);

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1).split('?')[0];
    }
  } catch (e) {
    console.error('Failed to extract YouTube video ID:', e);
  }
  return null;
}

// Fetch YouTube video duration from the video page
async function fetchYouTubeDuration(url) {
  try {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) {
      console.log('Could not extract video ID from URL');
      return null;
    }

    console.log('Fetching duration for video ID:', videoId);

    // Fetch the YouTube page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();

    // Try to extract duration from meta tags or JSON-LD
    // Look for ISO 8601 duration format (e.g., "PT10M23S")
    const durationMatch = html.match(/"duration":"PT(\d+H)?(\d+M)?(\d+S)?"/);

    if (durationMatch) {
      const hours = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
      const minutes = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
      const seconds = durationMatch[3] ? parseInt(durationMatch[3]) : 0;

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      console.log('✓ Fetched YouTube duration:', totalSeconds, 'seconds');
      return totalSeconds;
    }

    console.log('Could not find duration in YouTube page');
    return null;
  } catch (error) {
    console.error('Failed to fetch YouTube duration:', error);
    return null;
  }
}

// Calculate time estimate in seconds using smart platform-based defaults and title heuristics
async function calculateTimeEstimate(element, url, title, isYouTube, isReddit, isTwitter, isTikTok, isInstagram) {
  // Try to extract duration from DOM first (best effort)
  let extractedDuration = null;

  if (isYouTube) {
    // First try DOM extraction (works if we're on YouTube)
    extractedDuration = extractYouTubeDuration(element);
    if (extractedDuration && extractedDuration !== 600) { // If we found real duration (not default)
      console.log('✓ YouTube duration extracted from DOM:', extractedDuration, 'sec (', Math.floor(extractedDuration / 60), 'min)');
      return extractedDuration;
    }

    // If DOM extraction failed, try fetching from YouTube page (works from any site)
    const fetchedDuration = await fetchYouTubeDuration(url);
    if (fetchedDuration) {
      return fetchedDuration;
    }
  }

  // If extraction failed or not applicable, use smart defaults based on platform and title

  // YouTube: Use title length and URL patterns as heuristics
  if (isYouTube) {
    // Check for "Shorts" in URL
    if (url.includes('/shorts/')) {
      console.log('YouTube Short detected: 60 seconds');
      return 60; // YouTube Shorts are max 60 seconds
    }
    // Use title length as rough estimate
    // Shorter titles often = shorter videos, longer = longer
    const titleLength = title.length;
    if (titleLength < 30) {
      console.log('Short YouTube title: 5 min estimate');
      return 300; // 5 minutes
    } else if (titleLength < 60) {
      console.log('Medium YouTube title: 10 min estimate');
      return 600; // 10 minutes
    } else {
      console.log('Long YouTube title: 15 min estimate');
      return 900; // 15 minutes
    }
  }

  // TikTok: Always short videos
  if (isTikTok) {
    console.log('TikTok video: 45 seconds');
    return 45; // TikTok videos average 30-60 seconds
  }

  // Instagram: Reels vs Posts
  if (isInstagram) {
    if (url.includes('/reel/')) {
      console.log('Instagram Reel: 30 seconds');
      return 30; // Reels are short
    } else {
      console.log('Instagram Post: 20 seconds');
      return 20; // Image posts with captions
    }
  }

  // Reddit: Detect video vs text posts
  if (isReddit) {
    // Check URL patterns for videos
    if (url.includes('v.redd.it') ||
        url.includes('/video/') ||
        url.match(/\.(mp4|webm|mov|avi)$/i) ||
        isRedditVideoPost(element, url)) {
      console.log('Reddit video post: 8 min estimate');
      return 480; // Average Reddit video ~8 minutes
    }

    // Text post - use title length as proxy for post length
    const titleLength = title.length;
    if (titleLength < 50) {
      console.log('Short Reddit post: 1 min reading time');
      return 60; // Short post
    } else if (titleLength < 100) {
      console.log('Medium Reddit post: 2 min reading time');
      return 120; // Medium post
    } else {
      console.log('Long Reddit post: 3 min reading time');
      return 180; // Long post
    }
  }

  // Twitter: Always short text
  if (isTwitter) {
    console.log('Twitter post: 30 seconds reading time');
    return 30; // Tweets are quick to read
  }

  // Fallback default
  console.log('Using fallback estimate: 2 minutes');
  return 120; // 2 minutes default
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

  // Calculate time estimate (pass title for heuristics) - await since it's now async for YouTube
  const timeEstimate = await calculateTimeEstimate(target, url, title, isYouTube, isReddit, isTwitter, isTikTok, isInstagram);

  try {
    // Send to background script - it handles all validation and duplicate checking
    const response = await chrome.runtime.sendMessage({
      action: 'SAVE_LINK',
      url: url,
      title: title,
      timeEstimate: timeEstimate
    });

    // Show appropriate notification based on response
    if (response.success) {
      showNotification('Saved for later!', 'success');
    } else if (response.error?.includes('already exists')) {
      showNotification('Already saved!', 'warning');
    } else if (response.error?.includes('authenticated') || response.error?.includes('sign in')) {
      showNotification('Please sign in to save links', 'error');
    } else {
      showNotification('Failed to save - try again', 'error');
    }
  } catch (error) {
    console.error('Failed to save link:', error);
    // Service worker might have crashed - suggest reopening extension
    if (error.message?.includes('Extension context invalidated') ||
        error.message?.includes('message port closed')) {
      showNotification('Extension reloaded - try again', 'warning');
    } else {
      showNotification('Failed to save - try again', 'error');
    }
  }
}

// Listen for all clicks on the page
document.addEventListener('click', handleClick, true);

// YouTube-specific: Intercept internal navigation (SPA routing)
if (window.location.hostname.includes('youtube.com')) {
  // Listen for YouTube's navigation events
  document.addEventListener('yt-navigate-start', (event) => {
    if (!productivityModeEnabled) return;

    const targetUrl = event.detail?.endpoint?.commandMetadata?.webCommandMetadata?.url;
    if (!targetUrl) return;

    // Build full URL
    const fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://www.youtube.com${targetUrl}`;

    // Check if it's a video URL
    if (!isYouTubeVideoUrl(fullUrl)) return;

    // Prevent navigation
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Extract title from the clicked element
    const clickedElement = event.target?.closest('a, ytd-thumbnail, ytd-video-renderer');
    const title = clickedElement ? extractYouTubeTitle(clickedElement) : 'YouTube Video';

    // Save the link
    saveYouTubeVideo(fullUrl, title);
  }, true);

  // Also watch for URL changes (backup method)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && productivityModeEnabled) {
      // Check if navigated to a video page
      if (isYouTubeVideoUrl(currentUrl) && !isYouTubeVideoUrl(lastUrl)) {
        // User navigated to a video, redirect back and save
        const title = document.title.replace(' - YouTube', '') || 'YouTube Video';
        window.history.back();
        saveYouTubeVideo(currentUrl, title);
      }
      lastUrl = currentUrl;
    }
  });

  // Observe URL changes
  urlObserver.observe(document.querySelector('title'), {
    childList: true,
    subtree: true
  });
}

// Reddit-specific: Intercept internal navigation (SPA routing)
if (window.location.hostname.includes('reddit.com')) {
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && productivityModeEnabled) {
      // Check if navigated to a post page
      if (isRedditPostUrl(currentUrl) && !isRedditPostUrl(lastUrl)) {
        // User navigated to a post, redirect back and save
        const title = document.querySelector('h1')?.textContent || document.title.split(' : ')[0] || 'Reddit Post';
        window.history.back();
        saveSocialMediaLink(currentUrl, title);
      }
      lastUrl = currentUrl;
    }
  });

  // Observe URL changes
  urlObserver.observe(document.querySelector('title'), {
    childList: true,
    subtree: true
  });
}

// Twitter/X-specific: Intercept internal navigation (SPA routing)
if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && productivityModeEnabled) {
      // Check if navigated to a tweet
      if (isTwitterPostUrl(currentUrl) && !isTwitterPostUrl(lastUrl)) {
        // User navigated to a tweet, redirect back and save
        const tweetText = document.querySelector('[data-testid="tweetText"]')?.textContent || 'Twitter Post';
        const title = tweetText.length > 100 ? tweetText.substring(0, 100) + '...' : tweetText;
        window.history.back();
        saveSocialMediaLink(currentUrl, title);
      }
      lastUrl = currentUrl;
    }
  });

  // Observe URL changes
  urlObserver.observe(document.querySelector('title'), {
    childList: true,
    subtree: true
  });
}

// Instagram-specific: Intercept internal navigation (SPA routing)
if (window.location.hostname.includes('instagram.com')) {
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && productivityModeEnabled) {
      // Check if navigated to a post or reel
      if (isInstagramPostUrl(currentUrl) && !isInstagramPostUrl(lastUrl)) {
        // User navigated to a post, redirect back and save
        const title = document.querySelector('h1')?.textContent || 'Instagram Post';
        window.history.back();
        saveSocialMediaLink(currentUrl, title);
      }
      lastUrl = currentUrl;
    }
  });

  // Observe URL changes
  urlObserver.observe(document.querySelector('title'), {
    childList: true,
    subtree: true
  });
}

// TikTok-specific: Intercept internal navigation (SPA routing)
if (window.location.hostname.includes('tiktok.com')) {
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && productivityModeEnabled) {
      // Check if navigated to a video
      if (isTikTokVideoUrl(currentUrl) && !isTikTokVideoUrl(lastUrl)) {
        // User navigated to a video, redirect back and save
        const title = document.querySelector('h1')?.textContent || 'TikTok Video';
        window.history.back();
        saveSocialMediaLink(currentUrl, title);
      }
      lastUrl = currentUrl;
    }
  });

  // Observe URL changes
  urlObserver.observe(document.querySelector('title'), {
    childList: true,
    subtree: true
  });
}

// Helper function to save social media links with time estimate
async function saveSocialMediaLink(url, title, timeEstimate = 600) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'SAVE_LINK',
      url: url,
      title: title,
      timeEstimate: timeEstimate
    });

    if (response.success) {
      showNotification('Saved for later!', 'success');
    } else if (response.error?.includes('already exists')) {
      showNotification('Already saved!', 'warning');
    } else if (response.error?.includes('authenticated') || response.error?.includes('sign in')) {
      showNotification('Please sign in to save links', 'error');
    } else {
      showNotification('Failed to save - try again', 'error');
    }
  } catch (error) {
    console.error('Failed to save link:', error);
    if (error.message?.includes('Extension context invalidated') ||
        error.message?.includes('message port closed')) {
      showNotification('Extension reloaded - try again', 'warning');
    } else {
      showNotification('Failed to save - try again', 'error');
    }
  }
}

// Helper function to save YouTube videos (default 10 min if duration unknown)
async function saveYouTubeVideo(url, title) {
  await saveSocialMediaLink(url, title, 600);
}
