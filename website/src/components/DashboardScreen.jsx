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
  const [displayedTitle, setDisplayedTitle] = useState('')
  const fullTitle = 'Read Later Randomly'

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

  // Typewriter effect for title
  useEffect(() => {
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex <= fullTitle.length) {
        setDisplayedTitle(fullTitle.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
      }
    }, 100) // 100ms per character - adjust for speed

    return () => clearInterval(interval)
  }, [])

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
    <div className="min-h-screen bg-black">
      {/* Black top bar - rounded */}
      <div className="w-full bg-black px-8 py-8 rounded-3xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          {/* Left - Profile (smaller) */}
          {user && (
            <div className="flex items-center gap-2">
              <img
                src={user.photoURL || 'https://via.placeholder.com/48'}
                alt="Profile"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-white font-medium text-sm">
                  {user.displayName || 'User'}
                </p>
                <p className="text-neutral-400 text-xs">{user.email}</p>
              </div>
            </div>
          )}

          {/* Center - Title */}
          <h1 className="text-white text-4xl font-medium tracking-wide mr-27">
            {displayedTitle}
            <span className="animate-pulse">|</span>
          </h1>

          {/* Right - Icons and Sign Out */}
          <div className="flex items-center gap-4">
            {/* Stats icon */}
            <button className="text-white hover:text-neutral-300 transition-colors">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            {/* Help icon */}
            <button className="text-white hover:text-neutral-300 transition-colors">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Sign Out button */}
            <button
              onClick={handleSignOut}
              className="px-6 py-2 bg-transparent border-2 border-white text-white rounded-full hover:bg-white hover:text-black transition-colors font-medium text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Saved Links section */}
          <div className="mb-8">
            <div className="flex items-center gap-6 mb-6">
              {/* Left - Title */}
              <h2 className="text-4xl text-white font-medium">Saved Links</h2>

              {/* Search bar - wider and closer */}
              <div className="relative flex-1 max-w-2xl">
                <input
                  type="text"
                  placeholder=""
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-3 bg-black text-white rounded-full border border-white focus:outline-none placeholder-neutral-500"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6" fill="white" viewBox="0 0 24 24">
                  <path d="M21.71 20.29l-5.4-5.4a8 8 0 10-1.42 1.42l5.4 5.4a1 1 0 001.42 0 1 1 0 000-1.42zM4 10a6 6 0 116 6 6 6 0 01-6-6z" />
                </svg>
              </div>

              {/* Sort button */}
              <button className="px-8 py-3 bg-transparent text-white rounded-full border border-white hover:bg-white hover:text-black transition-colors font-medium">
                Sort
              </button>

              {/* Filter button */}
              <button className="px-8 py-3 bg-transparent text-white rounded-full border border-white hover:bg-white hover:text-black transition-colors font-medium">
                Filter
              </button>
            </div>

            {/* Horizontal line */}
            <div className="w-full h-px bg-white"></div>
          </div>

          {/* Link count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-white text-sm">
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
              <p className="text-white text-lg">
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
                  className="bg-white border-2 border-black rounded-xl p-5 hover:bg-neutral-100 transition-colors"
                >
                  {/* Card Content */}
                  <div className="mb-4">
                    <h3 className="text-black font-bold text-lg mb-2 line-clamp-2">
                      {link.title}
                    </h3>
                    <p className="text-neutral-600 text-sm mb-1">
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
                      className="flex-1 px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-black rounded-lg transition-colors text-sm font-medium border border-black"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleOpen(link.url, link.id)}
                      className="flex-1 px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-black rounded-lg transition-colors text-sm font-medium border border-black"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium border border-red-700"
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
    </div>
  )
}