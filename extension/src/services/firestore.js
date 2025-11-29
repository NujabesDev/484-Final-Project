import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

/**
 * Verify user is authenticated
 * @param {string} userId - User UID
 * @throws {Error} If userId is missing
 */
function ensureAuthenticated(userId) {
  if (!userId) {
    throw new Error('User not authenticated');
  }
}

/**
 * Load all links for a user
 * @param {Object} db - Firestore instance
 * @param {string} userId - User UID
 * @returns {Promise<Array>} Array of link objects
 */
export async function loadLinksFromFirestore(db, userId) {
  ensureAuthenticated(userId);

  const linksRef = collection(db, 'users', userId, 'links');
  const querySnapshot = await getDocs(linksRef);

  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Save a new link to Firestore
 * @param {Object} db - Firestore instance
 * @param {string} userId - User UID
 * @param {string} url - URL to save
 * @param {string} title - Page title
 * @param {string|null} thumbnail - Optional thumbnail URL
 * @returns {Promise<Object>} Saved link object
 * @throws {Error} If invalid URL
 */
export async function saveLinkToFirestore(db, userId, url, title, thumbnail = null) {
  ensureAuthenticated(userId);

  // Validate URL format
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  // Validate URL scheme (only allow http/https)
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }

  // Validate URL length (prevent abuse)
  if (url.length > 2048) {
    throw new Error('URL is too long (max 2048 characters)');
  }

  const linksRef = collection(db, 'users', userId, 'links');

  // Firestore duplicate check as safety net (rare, only if cache is stale)
  // Cache check in background.js handles 99% of cases instantly
  // This catches edge cases where cache is stale after service worker restart
  const duplicateQuery = query(linksRef, where('url', '==', url));
  const duplicateSnapshot = await getDocs(duplicateQuery);

  if (!duplicateSnapshot.empty) {
    throw new Error('Link already exists');
  }

  const timestamp = Date.now();
  const linkData = {
    url: url,
    title: title || url,
    createdAt: timestamp
  };

  // Add thumbnail if provided
  if (thumbnail) {
    linkData.thumbnail = thumbnail;
  }

  const docRef = await addDoc(linksRef, linkData);

  return {
    id: docRef.id,
    ...linkData
  };
}

/**
 * Delete a link from Firestore
 * @param {Object} db - Firestore instance
 * @param {string} userId - User UID
 * @param {string} linkId - Document ID
 * @returns {Promise<void>}
 */
export async function deleteLinkFromFirestore(db, userId, linkId) {
  ensureAuthenticated(userId);

  await deleteDoc(doc(db, 'users', userId, 'links', linkId));
}
