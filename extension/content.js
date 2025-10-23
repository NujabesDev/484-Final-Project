// Content script for click interception on blocked sites
// Runs on sites that the user has blocked in productivity mode

(function() {
  'use strict';

  let isProductivityModeEnabled = false;

  // Initialize by checking settings
  chrome.storage.local.get(['productivityMode'], (result) => {
    isProductivityModeEnabled = result.productivityMode || false;
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.productivityMode) {
      isProductivityModeEnabled = changes.productivityMode.newValue;
    }
  });

  // Intercept all clicks in capture phase (before they bubble)
  document.addEventListener('click', handleClick, true);
  document.addEventListener('auxclick', handleClick, true); // Middle-click
  document.addEventListener('keydown', handleKeydown, true);

  function handleClick(event) {
    if (!isProductivityModeEnabled) return;

    const link = event.target.closest('a');
    if (!link || !link.href) return;

    // Block YouTube videos specifically
    if (link.href.includes('youtube.com/watch')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      chrome.runtime.sendMessage({
        type: 'LINK_INTERCEPTED',
        url: link.href,
        title: link.textContent.trim() || link.href
      });
      return;
    }

    // Block Reddit posts/comments
    if (link.href.includes('reddit.com/r/') && link.href.includes('/comments/')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      chrome.runtime.sendMessage({
        type: 'LINK_INTERCEPTED',
        url: link.href,
        title: link.textContent.trim() || link.href
      });
      return;
    }

    // Allow everything else (navigation tabs, etc.)
  }

  function handleKeydown(event) {
    if (!isProductivityModeEnabled) return;

    if (event.key === 'Enter') {
      const link = document.activeElement;
      if (link && link.tagName === 'A' && link.href) {
        // Block YouTube videos
        if (link.href.includes('youtube.com/watch')) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          chrome.runtime.sendMessage({
            type: 'LINK_INTERCEPTED',
            url: link.href,
            title: link.textContent.trim() || link.href
          });
          return;
        }

        // Block Reddit posts
        if (link.href.includes('reddit.com/r/') && link.href.includes('/comments/')) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          chrome.runtime.sendMessage({
            type: 'LINK_INTERCEPTED',
            url: link.href,
            title: link.textContent.trim() || link.href
          });
          return;
        }
      }
    }
  }

  console.log('Read Later Random: Content script loaded');
})();
