import { db } from '@/lib/firebase-config'
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore'

/**
 * Load all links from Firestore for a specific user
 * @param {string} userId - The user's UID
 * @returns {Promise<Array>} Array of link objects with {id, url, title, timestamp, createdAt}
 */
export async function loadLinksFromFirestore(userId) {
  if (!userId) {
    return []
  }

  try {
    const linksRef = collection(db, 'users', userId, 'links')
    const querySnapshot = await getDocs(linksRef)

    const links = []
    querySnapshot.forEach((doc) => {
      links.push({
        id: doc.id,
        url: doc.data().url,
        title: doc.data().title,
        timestamp: doc.data().createdAt,
        createdAt: doc.data().createdAt
      })
    })

    return links
  } catch (error) {
    console.error('Error loading links:', error)
    return []
  }
}

/**
 * Delete a single link from Firestore
 * @param {string} userId - The user's UID
 * @param {string} linkId - The Firestore document ID of the link
 * @returns {Promise<void>}
 * @throws {Error} If delete fails
 */
export async function deleteLinkFromFirestore(userId, linkId) {
  if (!userId) {
    throw new Error('User not authenticated')
  }

  await deleteDoc(doc(db, 'users', userId, 'links', linkId))
}

/**
 * Delete multiple links from Firestore using batch operation
 * @param {string} userId - The user's UID
 * @param {Array<string>} linkIds - Array of Firestore document IDs to delete
 * @returns {Promise<void>}
 * @throws {Error} If batch delete fails
 */
export async function deleteMultipleLinks(userId, linkIds) {
  if (!userId) {
    throw new Error('User not authenticated')
  }

  if (!linkIds || linkIds.length === 0) {
    return
  }

  // Firestore batch operations have a limit of 500 operations
  // If we need to delete more, we'll split into multiple batches
  const BATCH_SIZE = 500

  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    const batchIds = linkIds.slice(i, i + BATCH_SIZE)

    batchIds.forEach((linkId) => {
      const linkRef = doc(db, 'users', userId, 'links', linkId)
      batch.delete(linkRef)
    })

    await batch.commit()
  }
}
