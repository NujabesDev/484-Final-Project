// Content script that bridges website <-> extension communication
// Runs on the auth website and relays messages via postMessage

console.log('[Auth Bridge] Content script loaded');

// Listen for messages from the webpage
window.addEventListener('message', async (event) => {
  // Verify the message is from our website
  const allowedOrigins = [
    'https://484-final-project-three.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];

  if (!allowedOrigins.includes(event.origin)) {
    console.log('[Auth Bridge] Ignored message from:', event.origin);
    return;
  }

  // Check if this is an auth message from the website
  if (event.data && event.data.type === 'AUTH_TO_EXTENSION') {
    console.log('[Auth Bridge] Received auth data from website');

    try {
      // Forward to background script using browser.runtime (works in Firefox) or chrome.runtime (works in Chrome)
      const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

      const response = await runtime.sendMessage({
        action: 'AUTH_SUCCESS',
        user: event.data.user,
        token: event.data.token
      });

      console.log('[Auth Bridge] Received response from background:', response);

      // Send success response back to webpage
      window.postMessage({
        type: 'AUTH_FROM_EXTENSION',
        success: response.success,
        error: response.error
      }, event.origin);

    } catch (error) {
      console.error('[Auth Bridge] Error forwarding to extension:', error);

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
console.log('[Auth Bridge] Notifying webpage that extension is ready');
window.postMessage({ type: 'EXTENSION_BRIDGE_READY' }, '*');
