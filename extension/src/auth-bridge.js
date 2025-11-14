// Content script that bridges website <-> extension communication
// Runs on the auth website and relays messages via postMessage

// Listen for messages from the webpage
window.addEventListener('message', async (event) => {
  // Verify the message is from our website
  const allowedOrigins = [
    'https://484-final-project-three.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];

  if (!allowedOrigins.includes(event.origin)) {
    return;
  }

  // Check if this is an auth message from the website
  if (event.data && event.data.type === 'AUTH_TO_EXTENSION') {

    try {
      // Forward to background script using browser.runtime (works in Firefox) or chrome.runtime (works in Chrome)
      const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

      const response = await runtime.sendMessage({
        action: 'AUTH_SUCCESS',
        user: event.data.user,
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
