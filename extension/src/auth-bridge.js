// Content script that bridges website <-> extension communication
// Runs on the auth website and relays messages via postMessage
import { ALLOWED_ORIGINS } from './config.js';

// Listen for messages from the webpage
window.addEventListener('message', async (event) => {
  // Verify the message is from our website
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    return;
  }

  // Check if this is an auth message from the website
  if (event.data && event.data.type === 'AUTH_TO_EXTENSION') {

    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        action: 'AUTH_SUCCESS',
        token: event.data.token
      });

      // Send success response back to webpage
      window.postMessage({
        type: 'AUTH_FROM_EXTENSION',
        success: response.success,
        error: response.error
      }, event.origin);

    } catch (error) {
      // Send error response back to webpage
      window.postMessage({
        type: 'AUTH_FROM_EXTENSION',
        success: false,
        error: error.message
      }, event.origin);
    }
  }
});

// Notify webpage that extension bridge is ready
window.postMessage({ type: 'EXTENSION_BRIDGE_READY' }, window.location.origin);
