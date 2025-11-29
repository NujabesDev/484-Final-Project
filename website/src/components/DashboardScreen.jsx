import { useState, useEffect } from 'react'
import { signOut } from '@/lib/auth'
import {
  loadLinksFromFirestore,
  deleteLinkFromFirestore,
  toggleArchiveStatus,
} from '@/lib/firestore-service'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'


export function DashboardScreen({ user }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [expandedCards, setExpandedCards] = useState(new Set())
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileDropdown])

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

  const handleArchive = async (linkId) => {
    try {
      const link = links.find(l => l.id === linkId)
      const newArchivedStatus = !link.archived

      // Update in Firestore
      await toggleArchiveStatus(user.uid, linkId, newArchivedStatus)

      // Update local state
      setLinks((prev) => prev.map(l =>
        l.id === linkId ? { ...l, archived: newArchivedStatus } : l
      ))

      toast.success(newArchivedStatus ? 'Link archived' : 'Link unarchived')
    } catch (error) {
      console.error('Error archiving link:', error)
      toast.error('Failed to archive link')
    }
  }

  const toggleExpanded = (linkId) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(linkId)) {
        newSet.delete(linkId)
      } else {
        newSet.add(linkId)
      }
      return newSet
    })
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
    // Filter by archive status based on current view
    const matchesArchiveStatus = showArchived ? link.archived === true : !link.archived

    // Filter by search query
    const query = searchQuery.toLowerCase()
    const matchesSearch = link.title.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query)

    return matchesArchiveStatus && matchesSearch
  })

  return (
    <div className="min-h-screen bg-black" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      {/* Black top bar - rounded */}
      <div className="w-full bg-black px-8 py-8 rounded-3xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          {/* Left - Profile with dropdown */}
          {user && (
            <div className="relative profile-dropdown-container">
              <div
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
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

              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-neutral-900 border border-white rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false)
                      handleSignOut()
                    }}
                    className="w-full px-6 py-3 text-left text-white hover:bg-neutral-800 transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Center - Title */}
          <h1 className="text-white text-4xl font-medium tracking-wide absolute left-1/2 transform -translate-x-1/2">
            {displayedTitle}
            <span className="animate-pulse">|</span>
          </h1>

          {/* Right - Icons */}
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
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Saved Links section */}
          <div className="mb-8">
            <div className="flex items-center gap-6 mb-13">
              {/* Left - Title */}
              <h2 className="text-4xl text-white font-medium">
                {showArchived ? 'Archived Links' : 'Saved Links'}
              </h2>

              {/* Search bar - reduced width */}
              <div className="relative flex-1 max-w-xl">
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

              {/* Archive button */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-8 py-3 rounded-full border border-white transition-colors font-medium flex items-center gap-2 ${
                  showArchived
                    ? 'bg-white text-black'
                    : 'bg-transparent text-white hover:bg-white hover:text-black'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                {showArchived ? 'Show Saved' : 'Archive'}
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
                  : showArchived
                  ? 'No archived links yet. Archive links to see them here!'
                  : 'No links saved yet. Start saving from the extension!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLinks.map((link) => {
                const isExpanded = expandedCards.has(link.id)
                const titleTooLong = link.title.length > 60

                return (
                  <div
                    key={link.id}
                    className="bg-black border border-white rounded-xl overflow-hidden hover:bg-neutral-900 transition-colors h-[320px] flex flex-col relative"
                  >
                    {/* Archive Icon - Top Left */}
                    <button
                      onClick={() => handleArchive(link.id)}
                      className="absolute top-2 left-2 z-10 p-2 bg-black/70 hover:bg-black border border-white rounded-lg transition-colors group"
                      title={link.archived ? 'Unarchive' : 'Archive'}
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>

                    {/* Image preview - FIXED */}
                    <div className="w-full h-40 bg-neutral-900 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {link.thumbnail ? (
                        <img
                          src={link.thumbnail}
                          alt={link.title}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/400x300?text=No+Preview"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                          <svg className="w-12 h-12 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content wrapper with padding */}
                    <div className="px-4 pt-2 pb-3 flex-1 flex flex-col min-h-0">
                      {/* Title section - FIXED HEIGHT CONTAINER */}
                      <div className="flex-shrink-0 overflow-hidden" style={{ maxHeight: isExpanded ? '80px' : '24px' }}>
                        {isExpanded ? (
                          <div className="text-white font-bold text-base leading-tight overflow-y-auto" style={{ maxHeight: '80px' }}>
                            {link.title}
                            {' '}
                            <button
                              onClick={() => toggleExpanded(link.id)}
                              className="text-neutral-400 hover:text-white text-xs underline whitespace-nowrap"
                            >
                              See less
                            </button>
                          </div>
                        ) : (
                          <div className="text-white font-bold text-base whitespace-nowrap overflow-hidden flex items-center h-6 -ml-3">
                            <span className="truncate flex-shrink min-w-0">
                              {link.title}
                            </span>
                            {titleTooLong && (
                              <button
                                onClick={() => toggleExpanded(link.id)}
                                className="text-neutral-400 hover:text-white text-xs underline ml-1 flex-shrink-0 whitespace-nowrap"
                              >
                                See more
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Spacer to push metadata and buttons down */}
                      <div className="flex-1 min-h-0"></div>

                      {/* Metadata - FIXED at bottom */}
                      <div className="flex-shrink-0 mb-2">
                        <p className="text-neutral-400 text-sm mb-1">
                          {getDomain(link.url)}
                        </p>
                        <p className="text-neutral-500 text-xs">
                          {getTimeAgo(link.createdAt)}
                        </p>
                      </div>

                      {/* Buttons - FIXED at bottom */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleCopy(link.url)}
                          className="flex-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium border border-white"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleOpen(link.url, link.id)}
                          className="flex-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium border border-white"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="flex-1 px-3 py-2 bg-red-900/50 hover:bg-red-900/70 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}