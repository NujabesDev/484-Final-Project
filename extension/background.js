// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Read Later Random extension installed!');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LINK_INTERCEPTED') {
    handleInterceptedLink(message, sender.tab);
    sendResponse({ success: true });
  }
  return true;
});

// Handle intercepted link
async function handleInterceptedLink(data, tab) {
  const { url, title } = data;
  const saved = await saveToQueue(url, title);
  if (saved) showSavedNotification(tab.id);
}

// Save a link to the queue
async function saveToQueue(url, title) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['queue'], (result) => {
      const queue = result.queue || [];

      if (queue.some(link => link.url === url)) {
        resolve(false);
        return;
      }

      queue.push({
        id: Date.now().toString(),
        url: url,
        title: title || url,
        timestamp: Date.now()
      });

      chrome.storage.local.set({ queue }, () => resolve(true));
    });
  });
}

// Show notification that link was saved
function showSavedNotification(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const notification = document.createElement('div');
      notification.textContent = '📚 Saved for later!';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #34a853;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: system-ui, sans-serif;
        font-size: 16px;
        font-weight: 600;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    }
  });
}
