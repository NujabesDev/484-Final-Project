/**
 * Shared utility functions for link formatting
 * These functions are used by both the extension and website
 */

/**
 * Format timestamp to "2d ago" style
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time string
 */
export function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago'
  if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago'
  return Math.floor(seconds / 2592000) + 'mo ago'
}

/**
 * Extract clean domain from URL
 * @param {string} url - Full URL
 * @returns {string} Clean domain without www.
 */
export function getDomain(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch (e) {
    return url
  }
}

/**
 * Get favicon URL from Google service
 * @param {string} url - Full URL
 * @returns {string} Favicon URL
 */
export function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch (e) {
    return ''
  }
}

/**
 * Truncate text to max length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
