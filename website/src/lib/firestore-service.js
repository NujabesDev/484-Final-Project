import { db } from '@/lib/firebase-config'
import { collection, getDocs, deleteDoc, doc, writeBatch, updateDoc } from 'firebase/firestore'

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
        ...doc.data()
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

/**
 * Toggle archive status of a link
 * @param {string} userId - The user's UID
 * @param {string} linkId - The Firestore document ID of the link
 * @param {boolean} archived - New archive status
 * @returns {Promise<void>}
 * @throws {Error} If update fails
 */
export async function toggleArchiveStatus(userId, linkId, archived) {
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const linkRef = doc(db, 'users', userId, 'links', linkId)
  await updateDoc(linkRef, {
    archived: archived
  })
}

/**
 * Update rating for a link
 * @param {string} userId - The user's UID
 * @param {string} linkId - The Firestore document ID of the link
 * @param {number} rating - Rating from 1-5
 * @returns {Promise<void>}
 * @throws {Error} If update fails
 */
export async function updateLinkRating(userId, linkId, rating) {
  if (!userId) {
    throw new Error('User not authenticated')
  }

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }

  const linkRef = doc(db, 'users', userId, 'links', linkId)
  await updateDoc(linkRef, {
    rating: rating
  })
}

/**
 * Archive or unarchive multiple links using batch operation
 * @param {string} userId - The user's UID
 * @param {Array<string>} linkIds - Array of Firestore document IDs to update
 * @param {boolean} archived - New archive status
 * @returns {Promise<void>}
 * @throws {Error} If batch update fails
 */
export async function archiveMultipleLinks(userId, linkIds, archived) {
  if (!userId) {
    throw new Error('User not authenticated')
  }

  if (!linkIds || linkIds.length === 0) {
    return
  }

  const BATCH_SIZE = 500

  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    const batchIds = linkIds.slice(i, i + BATCH_SIZE)

    batchIds.forEach((linkId) => {
      const linkRef = doc(db, 'users', userId, 'links', linkId)
      batch.update(linkRef, { archived })
    })

    await batch.commit()
  }
}

/**
 * Rate multiple links using batch operation
 * @param {string} userId - The user's UID
 * @param {Array<string>} linkIds - Array of Firestore document IDs to update
 * @param {number} rating - Rating from 1-5
 * @returns {Promise<void>}
 * @throws {Error} If batch update fails
 */
export async function rateMultipleLinks(userId, linkIds, rating) {
  if (!userId) {
    throw new Error('User not authenticated')
  }

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }

  if (!linkIds || linkIds.length === 0) {
    return
  }

  const BATCH_SIZE = 500

  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    const batchIds = linkIds.slice(i, i + BATCH_SIZE)

    batchIds.forEach((linkId) => {
      const linkRef = doc(db, 'users', userId, 'links', linkId)
      batch.update(linkRef, { rating })
    })

    await batch.commit()
  }
}
