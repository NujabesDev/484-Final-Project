import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

/**
 * Load all links from Firestore for a specific user
 * @param {string} userId - The user's UID
 * @returns {Promise<Array>} Array of link objects with {id, url, title, timestamp}
 */
export async function loadLinksFromFirestore(userId) {
  if (!userId) {
    return [];
  }

  try {
    // Load all links from Firestore for the current user
    const linksRef = collection(db, 'users', userId, 'links');
    const querySnapshot = await getDocs(linksRef);

    const links = [];
    querySnapshot.forEach((doc) => {
      links.push({
        id: doc.id,
        url: doc.data().url,
        title: doc.data().title,
        timestamp: doc.data().createdAt
      });
    });

    return links;
  } catch (error) {
    return [];
  }
}

/**
 * Save a new link to Firestore
 * @param {string} userId - The user's UID
 * @param {string} url - The URL to save
 * @param {string} title - The title of the page
 * @returns {Promise<Object>} The saved link object with {id, url, title, timestamp}
 * @throws {Error} If duplicate or save fails
 */
export async function saveLinkToFirestore(userId, url, title) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Check for duplicates in Firestore
  const linksRef = collection(db, 'users', userId, 'links');
  const q = query(linksRef, where('url', '==', url));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Duplicate logic check
    const existingDoc = querySnapshot.docs[0];
    return {
      id: existingDoc.id,
      url: existingDoc.data().url,
      title: existingDoc.data().title,
      timestamp: existingDoc.data().createdAt
    };
  }

  // Save to Firestore
  const docRef = await addDoc(collection(db, 'users', userId, 'links'), {
    url: url,
    title: title || url,
    createdAt: Date.now()
  });

  // Return the new link object
  return {
    id: docRef.id,
    url: url,
    title: title || url,
    timestamp: Date.now()
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
  if (!userId) {
    throw new Error('User not authenticated');
  }

  await deleteDoc(doc(db, 'users', userId, 'links', linkId));
}
