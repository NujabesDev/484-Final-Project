// Extension messaging utilities
// Used by website to communicate with the browser extension

// IMPORTANT: Replace this with your actual extension ID after loading it in Chrome
// To get your extension ID:
// 1. Build the extension: cd extension && npm run build
// 2. Load unpacked extension in Chrome from extension/dist folder
// 3. Go to chrome://extensions and copy the ID shown under your extension
// 4. Paste it here
const EXTENSION_ID = 'kjalmecmionambgdakfmcmjfobgioajo'

/**
 * Check if the extension is installed and responding
 * @returns {Promise<boolean>}
 */
export async function isExtensionInstalled() {
  try {
    const response = await chrome.runtime.sendMessage(EXTENSION_ID, {
      action: 'PING'
    })
    return response?.success === true
  } catch (error) {
    console.log('Extension not installed or not responding:', error.message)
    return false
  }
}

/**
 * Send user authentication data to the extension
 * @param {Object} user - User object from Firebase Auth
 * @param {string} user.uid - User ID
 * @param {string} user.email - User email
 * @param {string} user.displayName - User display name
 * @param {string} user.photoURL - User photo URL
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendUserToExtension(user) {
  try {
    // Check if extension is installed first
    const installed = await isExtensionInstalled()
    if (!installed) {
      return {
        success: false,
        error: 'Extension not installed'
      }
    }

    // Send user data to extension
    const response = await chrome.runtime.sendMessage(EXTENSION_ID, {
      action: 'SET_USER',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    })

    if (response?.success) {
      console.log('User data sent to extension successfully')
      return { success: true }
    } else {
      console.error('Failed to send user data to extension:', response?.error)
      return {
        success: false,
        error: response?.error || 'Unknown error'
      }
    }
  } catch (error) {
    console.error('Error sending user to extension:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Clear user data from the extension (sign out)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function clearUserFromExtension() {
  try {
    // Check if extension is installed first
    const installed = await isExtensionInstalled()
    if (!installed) {
      return {
        success: false,
        error: 'Extension not installed'
      }
    }

    // Clear user data from extension
    const response = await chrome.runtime.sendMessage(EXTENSION_ID, {
      action: 'CLEAR_USER'
    })

    if (response?.success) {
      console.log('User data cleared from extension successfully')
      return { success: true }
    } else {
      console.error('Failed to clear user data from extension:', response?.error)
      return {
        success: false,
        error: response?.error || 'Unknown error'
      }
    }
  } catch (error) {
    console.error('Error clearing user from extension:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
