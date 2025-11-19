// Content script that relays auth messages between website and extension

// Allowed origins for postMessage (keep in sync with manifest.json)
const ALLOWED_ORIGINS = [
  'https://484-final-project-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Listen for auth messages from webpage
window.addEventListener('message', async (event) => {
  // Verify message origin
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    return;
  }

  // Handle auth token from website
  if (event.data && event.data.type === 'AUTH_TO_EXTENSION') {
    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        action: 'AUTH_SUCCESS',
        token: event.data.token
      });

      // Send response back to webpage
      window.postMessage({
        type: 'AUTH_FROM_EXTENSION',
        success: response.success,
        error: response.error
      }, event.origin);

    } catch (error) {
      // Send error response to webpage
      window.postMessage({
        type: 'AUTH_FROM_EXTENSION',
        success: false,
        error: error.message
      }, event.origin);
    }
  }
});

// Notify webpage that extension is ready
window.postMessage({ type: 'EXTENSION_BRIDGE_READY' }, window.location.origin);
