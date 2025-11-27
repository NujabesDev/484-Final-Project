import { useState, useEffect } from 'react'
import { signOut } from '@/lib/auth'
import {
  loadLinksFromFirestore,
  deleteLinkFromFirestore,
} from '@/lib/firestore-service'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export function DashboardScreen({ user }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user) return

    async function fetchLinks() {
      try {
        const linksData = await loadLinksFromFirestore(user.uid)
        setLinks(linksData)
      } catch (error) {
        console.error('Error fetching links:', error)
        toast.error('Failed to load links')
      } finally {
        setLoading(false)
      }
    }

    fetchLinks()
  }, [user])

  // useEffect(() => {
  //   // TEMPORARY: Mock data for testing
  //   setLinks([
  //     {
  //       id: '1',
  //       title: 'Example Link 1',
  //       url: 'https://example.com',
  //       createdAt: Date.now() - 1000 * 60 * 15 // 15 min ago
  //     },
  //     {
  //       id: '2',
  //       title: 'Example Link 2',
  //       url: 'https://google.com',
  //       createdAt: Date.now() - 1000 * 60 * 60 * 24 // 1 day ago
  //     }
  //   ])
  //   setLoading(false)
  // }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.reload()
    } catch (error) {
      // Silent failure - page will reload anyway
    }
  }

  const handleDelete = async (linkId) => {
    // TEMPORARY: Just remove from state for testing
    setLinks((prev) => prev.filter((link) => link.id !== linkId))
    toast.success('Link deleted')
  }

  const handleOpen = (url, linkId) => {
    window.open(url, '_blank')
    handleDelete(linkId)
  }

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  const getDomain = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '')
      return domain
    } catch {
      return 'Unknown'
    }
  }

  const getTimeAgo = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    if (years > 0) return `${years}y ago`
    if (months > 0) return `${months}mo ago`
    if (weeks > 0) return `${weeks}w ago`
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const filteredLinks = links.filter((link) => {
    const query = searchQuery.toLowerCase()
    return (
      link.title.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with user info and sign out */}
        {user && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img
                src={user.photoURL || 'https://via.placeholder.com/48'}
                alt="Profile"
                className="w-12 h-12 rounded-full border-2 border-neutral-800"
              />
              <div>
                <p className="text-white font-medium">
                  {user.displayName || 'User'}
                </p>
                <p className="text-neutral-400 text-sm">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors font-medium border border-neutral-800"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Title and subtitle */}
        <div className="mb-8">
          <h1 className="text-6xl font-serif text-white mb-2">Saved Links</h1>
          <p className="text-neutral-500 text-lg">Manage your saved links from the extension</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 bg-neutral-900 text-white rounded-xl border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700 placeholder-neutral-500"
          />
        </div>

        {/* Link count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-neutral-400 text-sm">
            {filteredLinks.length} link{filteredLinks.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-lg">
              {searchQuery
                ? 'No links match your search'
                : 'No links saved yet. Start saving from the extension!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:bg-neutral-800 transition-colors"
              >
                {/* Card Content */}
                <div className="mb-4">
                  <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                    {link.title}
                  </h3>
                  <p className="text-neutral-400 text-sm mb-1">
                    {getDomain(link.url)}
                  </p>
                  <p className="text-neutral-500 text-xs">
                    {getTimeAgo(link.createdAt)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(link.url)}
                    className="flex-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium border border-neutral-700"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleOpen(link.url, link.id)}
                    className="flex-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium border border-neutral-700"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="flex-1 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-900/50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}