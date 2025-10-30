// Content script for click interception on blocked sites
// Runs on sites that the user has blocked in productivity mode

(function () {
  'use strict';

  let isProductivityModeEnabled = true;

  // Initialize by checking settings
  chrome.storage.local.get(['productivityMode'], (result) => {
    isProductivityModeEnabled = result.productivityMode;
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.productivityMode) {
      isProductivityModeEnabled = changes.productivityMode.newValue;
    }
  });

  // Intercept all clicks from user
  document.addEventListener('click', handleClick, true); // left click
  document.addEventListener('auxclick', handleClick, true); // middle click
  // document.addEventListener('keydown', handleKeydown, true); // enter key

  // current way of finding links when user clicks, will add more to this later
  function handleClick(event) {
    if (!isProductivityModeEnabled) return;

    // finds closest <a> tag with user click
    const link = event.target.closest('a');

    if (!link || !link.href) return;
    if (!link.href.startsWith('http')) return;


    // Block Reddit posts
    if (link.href.includes('reddit.com/r/') && link.href.includes('/comments/')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      interceptLink(link);
      return;
    }
  }

  // function handleKeydown(event) {
  //   if (!isProductivityModeEnabled) return;

  //   if (event.key === 'Enter') {
  //     const link = document.activeElement;
  //     if (link && link.tagName === 'A' && link.href) {

  //       // Block Reddit posts
  //       if (link.href.includes('reddit.com/r/') && link.href.includes('/comments/')) {
  //         event.preventDefault();
  //         event.stopPropagation();
  //         event.stopImmediatePropagation();
  //         interceptLink(link);
  //         return;
  //       }
  //     }
  //   }
  // }

  function interceptLink(link) {
    chrome.runtime.sendMessage({
      type: 'LINK_INTERCEPTED',
      url: link.href,
      title: link.textContent.trim() || link.href
    });
  }

  console.log('Read Later Random: Content script loaded');
})();

y
