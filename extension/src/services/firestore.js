import { db } from '../background.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

/**
 * Guard function to ensure user is authenticated
 * @param {string} userId - The user's UID
 * @throws {Error} If userId is not provided
 */
function ensureAuthenticated(userId) {
  if (!userId) {
    throw new Error('User not authenticated');
  }
}

/**
 * Load all links from Firestore for a specific user
 * @param {string} userId - The user's UID
 * @returns {Promise<Array>} Array of link objects with {id, url, title, timestamp}
 */
export async function loadLinksFromFirestore(userId) {
  ensureAuthenticated(userId);

  // Load all links from Firestore for the current user
  const linksRef = collection(db, 'users', userId, 'links');
  const querySnapshot = await getDocs(linksRef);

  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Save a new link to Firestore
 * @param {string} userId - The user's UID
 * @param {string} url - The URL to save
 * @param {string} title - The title of the page
 * @returns {Promise<Object>} The saved link object with {id, url, title, createdAt}
 * @throws {Error} If duplicate or save fails
 */
export async function saveLinkToFirestore(userId, url, title) {
  ensureAuthenticated(userId);

  // Check for duplicates in Firestore
  const linksRef = collection(db, 'users', userId, 'links');
  const q = query(linksRef, where('url', '==', url));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    throw new Error('Link already exists');
  }

  // Save to Firestore with single timestamp
  const timestamp = Date.now();
  const linkData = {
    url: url,
    title: title || url,
    createdAt: timestamp
  };

  const docRef = await addDoc(linksRef, linkData);

  // Return the new link object
  return {
    id: docRef.id,
    ...linkData
  };
}

/**
 * Delete a link from Firestore
 * @param {string} userId - The user's UID
 * @param {string} linkId - The Firestore document ID of the link
 * @returns {Promise<void>}
 * @throws {Error} If delete fails
 */
export async function deleteLinkFromFirestore(userId, linkId) {
  ensureAuthenticated(userId);

  await deleteDoc(doc(db, 'users', userId, 'links', linkId));
}
