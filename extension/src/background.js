// Background service worker for auth sync with website
import browser from 'webextension-polyfill'

// Listen for messages from website (via externally_connectable in manifest)
browser.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('Received message from external:', request.action, sender.url)

  // Verify sender is from allowed origins
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-website.com' // Replace with your actual website domain
  ]

  const senderOrigin = new URL(sender.url).origin
  if (!allowedOrigins.includes(senderOrigin)) {
    sendResponse({ success: false, error: 'Unauthorized origin' })
    return
  }

  // Handle auth sync actions
  switch (request.action) {
    case 'SET_USER':
      handleSetUser(request.user).then(sendResponse)
      return true

    case 'CLEAR_USER':
      handleClearUser().then(sendResponse)
      return true

    case 'PING':
      sendResponse({ success: true, message: 'Extension is active' })
      return false

    default:
      sendResponse({ success: false, error: 'Unknown action' })
      return false
  }
})

// Save user data from website
async function handleSetUser(user) {
  try {
    await browser.storage.local.set({ user })
    console.log('User saved to extension storage:', user.email)
    return { success: true }
  } catch (error) {
    console.error('Error saving user:', error)
    return { success: false, error: error.message }
  }
}

// Clear user data (logout)
async function handleClearUser() {
  try {
    await browser.storage.local.remove('user')
    console.log('User cleared from extension storage')
    return { success: true }
  } catch (error) {
    console.error('Error clearing user:', error)
    return { success: false, error: error.message }
  }
}

// Log when extension is installed/updated
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason)
})
