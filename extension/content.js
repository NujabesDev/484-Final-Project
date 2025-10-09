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

    // Allow same-site navigation (subpages, tabs, etc.)
    try {
      const linkUrl = new URL(link.href);
      const currentUrl = new URL(window.location.href);

      // If it's the same hostname, allow it (e.g., youtube.com -> youtube.com/subscriptions)
      if (linkUrl.hostname === currentUrl.hostname) {
        return;
      }
    } catch (e) {
      // If URL parsing fails, block it to be safe
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    chrome.runtime.sendMessage({
      type: 'LINK_INTERCEPTED',
      url: link.href,
      title: link.textContent.trim() || link.href
    });
  }

  function handleKeydown(event) {
    if (!isProductivityModeEnabled) return;

    if (event.key === 'Enter') {
      const link = document.activeElement;
      if (link && link.tagName === 'A' && link.href) {
        // Allow same-site navigation
        try {
          const linkUrl = new URL(link.href);
          const currentUrl = new URL(window.location.href);
          if (linkUrl.hostname === currentUrl.hostname) {
            return;
          }
        } catch (e) {}

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        chrome.runtime.sendMessage({
          type: 'LINK_INTERCEPTED',
          url: link.href,
          title: link.textContent.trim() || link.href
        });
      }
    }
  }

  console.log('Read Later Random: Content script loaded');
})();
