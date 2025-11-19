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
 * @returns {Promise<Object>} Saved link object
 * @throws {Error} If duplicate or invalid
 */
export async function saveLinkToFirestore(db, userId, url, title) {
  ensureAuthenticated(userId);

  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  const linksRef = collection(db, 'users', userId, 'links');

  // Check for duplicate
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
