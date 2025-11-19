// Content script that bridges website <-> extension communication
// Runs on the auth website and relays messages via postMessage

// Allowed origins for postMessage communication
// NOTE: Keep in sync with manifest.json content_scripts.matches
const ALLOWED_ORIGINS = [
  'https://484-final-project-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

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
