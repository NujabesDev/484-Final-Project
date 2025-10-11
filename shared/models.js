// Data models and types
// Shared between extension and website

/**
 * Link model
 * @typedef {Object} Link
 * @property {string} id - Unique identifier
 * @property {string} url - The URL
 * @property {string} title - Page title
 * @property {number} timestamp - When it was saved
 * @property {string} userId - User who saved it
 * @property {boolean} read - Whether it's been read
 * @property {string} [summary] - AI-generated summary (optional)
 */

/**
 * Create a new link object
 * @param {string} url
 * @param {string} title
 * @param {string} userId
 * @returns {Omit<Link, 'id'>}
 */
export const createLink = (url, title, userId) => {
  return {
    url,
    title,
    timestamp: Date.now(),
    userId,
    read: false
  };
};
