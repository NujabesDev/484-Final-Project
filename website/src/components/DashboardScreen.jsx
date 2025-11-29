import { useState, useEffect } from 'react'
import { signOut } from '@/lib/auth'
import {
  loadLinksFromFirestore,
  deleteLinkFromFirestore,
  toggleArchiveStatus,
  updateLinkRating,
} from '@/lib/firestore-service'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'


export function DashboardScreen({ user, onNavigateToStats, onNavigateToFAQ }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [expandedCards, setExpandedCards] = useState(new Set())
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [ratingPopupOpen, setRatingPopupOpen] = useState(null)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [sortOption, setSortOption] = useState('mostRecent') // default sort option
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showHelpPopup, setShowHelpPopup] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [filters, setFilters] = useState({
    domain: 'all',
    dateSaved: 'all',
    starRating: 'all',
    topic: 'all'
  })
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
    let dotAdded = false
    const interval = setInterval(() => {
      if (currentIndex <= fullTitle.length) {
        setDisplayedTitle(fullTitle.slice(0, currentIndex))
        currentIndex++
      } else if (!dotAdded) {
        setDisplayedTitle(fullTitle + '.')
        dotAdded = true
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

  // Close rating popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ratingPopupOpen && !event.target.closest('.rating-popup-container')) {
        setRatingPopupOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ratingPopupOpen])

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSortDropdown && !event.target.closest('.sort-dropdown-container')) {
        setShowSortDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSortDropdown])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown])

  // Close help popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHelpPopup && !event.target.closest('.help-popup-container')) {
        setShowHelpPopup(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHelpPopup])

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.reload()
    } catch (error) {
      // Silent failure - page will reload anyway
    }
  }

  const handleDelete = async (linkId) => {
    try {
      // Delete from Firestore
      await deleteLinkFromFirestore(user.uid, linkId)

      // Remove from state
      setLinks((prev) => prev.filter((link) => link.id !== linkId))
      toast.success('Link deleted')
    } catch (error) {
      console.error('Error deleting link:', error)
      toast.error('Failed to delete link')
    }
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

  const handleRating = async (linkId, rating) => {
    try {
      // Update in Firestore
      await updateLinkRating(user.uid, linkId, rating)

      // Update local state
      setLinks((prev) => prev.map(l =>
        l.id === linkId ? { ...l, rating } : l
      ))

      // Close popup
      setRatingPopupOpen(null)

      toast.success(`Rated ${rating} star${rating > 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error rating link:', error)
      toast.error('Failed to update rating')
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

  const classifyTopic = (link) => {
    const title = link.title.toLowerCase()
    const url = link.url.toLowerCase()

    // Tech keywords
    if (title.match(/\b(code|programming|software|developer|tech|computer|ai|machine learning|javascript|python|react|github|api|database|server|web|app|mobile|ios|android|cloud|aws|google cloud|azure|docker|kubernetes|linux|windows|mac|crypto|blockchain|bitcoin|ethereum)\b/) ||
        url.match(/stackoverflow|github|dev\.to|medium\.com\/.*tech|techcrunch|arstechnica|theverge|wired\.com|cnet\.com/)) {
      return 'Tech'
    }

    // Finance keywords
    if (title.match(/\b(stock|invest|trading|finance|money|bank|crypto|bitcoin|ethereum|portfolio|401k|retirement|savings|mortgage|loan|credit|debt|tax|budget|wealth|market|economy|dividend|bond|forex)\b/) ||
        url.match(/bloomberg|cnbc|marketwatch|investopedia|wallstreetjournal|finance\.yahoo|nerdwallet|mint\.com/)) {
      return 'Finance'
    }

    // Cooking keywords
    if (title.match(/\b(recipe|cook|bake|food|chef|kitchen|meal|dish|ingredient|cuisine|diet|nutrition|restaurant|dessert|breakfast|lunch|dinner|appetizer|sauce|spice|oven|grill|fry|boil|healthy eating)\b/) ||
        url.match(/allrecipes|foodnetwork|epicurious|seriouseats|bonappetit|tasty\.co|delish\.com|food52/)) {
      return 'Cooking'
    }

    // Entertainment keywords
    if (title.match(/\b(movie|film|tv show|series|netflix|hulu|disney|hbo|streaming|music|song|album|artist|band|concert|game|gaming|playstation|xbox|nintendo|esports|anime|manga|comic|marvel|dc|star wars|lord of the rings|podcast|youtube|twitch|celebrity|actor|actress)\b/) ||
        url.match(/imdb|rottentomatoes|netflix|hulu|spotify|apple music|twitch\.tv|ign\.com|gamespot|polygon\.com|kotaku|entertainment\.com/)) {
      return 'Entertainment'
    }

    // School/Work keywords
    if (title.match(/\b(essay|research|study|homework|assignment|course|class|lecture|professor|student|education|university|college|school|degree|certification|exam|test|project|paper|thesis|dissertation|career|job|resume|interview|linkedin|professional|office|meeting|presentation|deadline|workload)\b/) ||
        url.match(/coursera|udemy|khanacademy|edx|scholar\.google|researchgate|linkedin\.com|indeed\.com|glassdoor/)) {
      return 'School/Work'
    }

    return 'Other'
  }

  const checkDateFilter = (timestamp, filter) => {
    if (filter === 'all') return true

    const now = Date.now()
    const diff = now - timestamp
    const hours = diff / (1000 * 60 * 60)
    const days = hours / 24
    const weeks = days / 7

    switch (filter) {
      case 'today':
        return hours < 24
      case 'thisWeek':
        return days < 7
      case 'thisMonth':
        return days < 30
      case 'older':
        return days >= 30
      default:
        return true
    }
  }

  const applyFilters = (link) => {
    // Domain filter
    if (filters.domain !== 'all') {
      const url = link.url.toLowerCase()
      if (filters.domain === 'reddit' && !url.includes('reddit.com')) return false
      if (filters.domain === 'youtube' && !url.includes('youtube.com')) return false
      if (filters.domain === 'articles' && (url.includes('reddit.com') || url.includes('youtube.com'))) return false
    }

    // Date filter
    if (!checkDateFilter(link.createdAt, filters.dateSaved)) return false

    // Star Rating filter
    if (filters.starRating !== 'all') {
      const rating = link.rating || null
      if (filters.starRating === 'unrated' && rating !== null) return false
      if (filters.starRating === '5stars' && rating !== 5) return false
      if (filters.starRating === '4stars' && rating !== 4) return false
      if (filters.starRating === '3stars' && rating !== 3) return false
      if (filters.starRating === '2stars' && rating !== 2) return false
      if (filters.starRating === '1star' && rating !== 1) return false
    }

    // Topic filter
    if (filters.topic !== 'all') {
      const topic = classifyTopic(link)
      if (topic !== filters.topic) return false
    }

    return true
  }

  const updateFilter = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: value
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      domain: 'all',
      dateSaved: 'all',
      starRating: 'all',
      topic: 'all'
    })
  }

  const hasActiveFilters = () => {
    return filters.domain !== 'all' ||
           filters.dateSaved !== 'all' ||
           filters.starRating !== 'all' ||
           filters.topic !== 'all'
  }

  const sortLinks = (linksToSort) => {
    const sorted = [...linksToSort]

    switch (sortOption) {
      case 'aToZ':
        return sorted.sort((a, b) => a.title.localeCompare(b.title))
      case 'zToA':
        return sorted.sort((a, b) => b.title.localeCompare(a.title))
      case 'mostRecent':
        return sorted.sort((a, b) => b.createdAt - a.createdAt)
      case 'oldest':
        return sorted.sort((a, b) => a.createdAt - b.createdAt)
      case 'highestRated':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      case 'lowestRated':
        return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0))
      default:
        return sorted
    }
  }

  const filteredLinks = sortLinks(links.filter((link) => {
    // Filter by archive status based on current view
    const matchesArchiveStatus = showArchived ? link.archived === true : !link.archived

    // Filter by search query
    const query = searchQuery.toLowerCase()
    const matchesSearch = link.title.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query)

    // Apply custom filters
    const matchesFilters = applyFilters(link)

    return matchesArchiveStatus && matchesSearch && matchesFilters
  }))

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
            <button
              onClick={onNavigateToStats}
              className="text-white hover:text-neutral-300 transition-colors"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            {/* Help icon with popup */}
            <div className="relative help-popup-container">
              <button
                onClick={() => setShowHelpPopup(!showHelpPopup)}
                className="text-white hover:text-neutral-300 transition-colors"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Help Popup */}
              {showHelpPopup && (
                <div className="absolute top-full right-0 mt-2 bg-neutral-900 border border-white rounded-lg shadow-lg overflow-hidden z-50 w-48">
                  <button
                    onClick={() => {
                      onNavigateToFAQ()
                      setShowHelpPopup(false)
                    }}
                    className="w-full px-6 py-3 text-left text-white hover:bg-neutral-800 transition-colors text-sm font-medium"
                  >
                    FAQ
                  </button>
                  <button
                    onClick={() => {
                      window.open('https://github.com/anthropics/claude-code/issues', '_blank')
                      setShowHelpPopup(false)
                    }}
                    className="w-full px-6 py-3 text-left text-white hover:bg-neutral-800 transition-colors text-sm font-medium border-t border-neutral-700"
                  >
                    Request Support
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Saved Links section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-13">
              {/* Left - Title */}
              <h2 className="text-4xl text-white font-medium">
                {showArchived ? 'Archived Links' : 'Saved Links'}
              </h2>

              {/* Right - Controls */}
              <div className="flex items-center gap-4">
                {/* Search bar - with smooth expansion */}
                <div className={`relative transition-all duration-300 ${searchFocused || searchQuery ? 'w-80' : 'w-48'}`}>
                  <input
                    type="text"
                    placeholder=""
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="w-full pl-12 pr-6 py-3 bg-black text-white rounded-full border border-white focus:outline-none placeholder-neutral-500 transition-all duration-300"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6" fill="white" viewBox="0 0 24 24">
                    <path d="M21.71 20.29l-5.4-5.4a8 8 0 10-1.42 1.42l5.4 5.4a1 1 0 001.42 0 1 1 0 000-1.42zM4 10a6 6 0 116 6 6 6 0 01-6-6z" />
                  </svg>
                </div>

                {/* Sort button with dropdown */}
                <div className="relative sort-dropdown-container">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="px-8 py-3 bg-transparent text-white rounded-full border border-white hover:bg-white hover:text-black transition-colors font-medium"
                >
                  Sort
                </button>

                {/* Sort Dropdown Menu */}
                {showSortDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-neutral-900 border border-white rounded-lg shadow-lg overflow-hidden z-50 min-w-[220px]">
                    <button
                      onClick={() => {
                        setSortOption('aToZ')
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-6 py-3 text-left transition-colors text-sm font-medium whitespace-nowrap ${
                        sortOption === 'aToZ' ? 'bg-neutral-700 text-white' : 'text-white hover:bg-neutral-800'
                      }`}
                    >
                      A → Z
                    </button>
                    <button
                      onClick={() => {
                        setSortOption('zToA')
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-6 py-3 text-left transition-colors text-sm font-medium whitespace-nowrap ${
                        sortOption === 'zToA' ? 'bg-neutral-700 text-white' : 'text-white hover:bg-neutral-800'
                      }`}
                    >
                      Z → A
                    </button>
                    <button
                      onClick={() => {
                        setSortOption('mostRecent')
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-6 py-3 text-left transition-colors text-sm font-medium whitespace-nowrap ${
                        sortOption === 'mostRecent' ? 'bg-neutral-700 text-white' : 'text-white hover:bg-neutral-800'
                      }`}
                    >
                      Most recently added
                    </button>
                    <button
                      onClick={() => {
                        setSortOption('oldest')
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-6 py-3 text-left transition-colors text-sm font-medium whitespace-nowrap ${
                        sortOption === 'oldest' ? 'bg-neutral-700 text-white' : 'text-white hover:bg-neutral-800'
                      }`}
                    >
                      Oldest first
                    </button>
                    <button
                      onClick={() => {
                        setSortOption('highestRated')
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-6 py-3 text-left transition-colors text-sm font-medium whitespace-nowrap ${
                        sortOption === 'highestRated' ? 'bg-neutral-700 text-white' : 'text-white hover:bg-neutral-800'
                      }`}
                    >
                      Highest rated
                    </button>
                    <button
                      onClick={() => {
                        setSortOption('lowestRated')
                        setShowSortDropdown(false)
                      }}
                      className={`w-full px-6 py-3 text-left transition-colors text-sm font-medium whitespace-nowrap ${
                        sortOption === 'lowestRated' ? 'bg-neutral-700 text-white' : 'text-white hover:bg-neutral-800'
                      }`}
                    >
                      Lowest rated
                    </button>
                  </div>
                )}
              </div>

              {/* Filter button with dropdown */}
              <div className="relative filter-dropdown-container">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`px-8 py-3 rounded-full border border-white transition-colors font-medium flex items-center gap-2 ${
                    hasActiveFilters()
                      ? 'bg-white text-black'
                      : 'bg-transparent text-white hover:bg-white hover:text-black'
                  }`}
                >
                  Filter
                  {hasActiveFilters() && (
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                  )}
                </button>

                {/* Filter Dropdown Menu */}
                {showFilterDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-neutral-900 border border-white rounded-lg shadow-lg overflow-hidden z-50 w-[320px]">
                    {/* Header with Clear All */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-700">
                      <span className="text-white font-semibold text-sm">Filters</span>
                      {hasActiveFilters() && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-neutral-400 hover:text-white transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Domain Filter */}
                    <div className="border-b border-neutral-700">
                      <div className="px-6 py-2 bg-neutral-800">
                        <span className="text-white font-medium text-xs">Domain</span>
                      </div>
                      <div className="px-4 py-2">
                        {[
                          { value: 'all', label: 'All Domains' },
                          { value: 'reddit', label: 'Reddit' },
                          { value: 'youtube', label: 'YouTube' },
                          { value: 'articles', label: 'Articles' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateFilter('domain', option.value)}
                            className={`w-full px-4 py-2 text-left text-sm rounded transition-colors ${
                              filters.domain === option.value
                                ? 'bg-neutral-700 text-white font-medium'
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Saved Filter */}
                    <div className="border-b border-neutral-700">
                      <div className="px-6 py-2 bg-neutral-800">
                        <span className="text-white font-medium text-xs">Date Saved</span>
                      </div>
                      <div className="px-4 py-2">
                        {[
                          { value: 'all', label: 'All Dates' },
                          { value: 'today', label: 'Today' },
                          { value: 'thisWeek', label: 'This Week' },
                          { value: 'thisMonth', label: 'This Month' },
                          { value: 'older', label: 'Older' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateFilter('dateSaved', option.value)}
                            className={`w-full px-4 py-2 text-left text-sm rounded transition-colors ${
                              filters.dateSaved === option.value
                                ? 'bg-neutral-700 text-white font-medium'
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Star Rating Filter */}
                    <div className="border-b border-neutral-700">
                      <div className="px-6 py-2 bg-neutral-800">
                        <span className="text-white font-medium text-xs">Star Rating</span>
                      </div>
                      <div className="px-4 py-2">
                        {[
                          { value: 'all', label: 'All Ratings' },
                          { value: '5stars', label: '5 stars' },
                          { value: '4stars', label: '4 stars' },
                          { value: '3stars', label: '3 stars' },
                          { value: '2stars', label: '2 stars' },
                          { value: '1star', label: '1 star' },
                          { value: 'unrated', label: 'Unrated' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateFilter('starRating', option.value)}
                            className={`w-full px-4 py-2 text-left text-sm rounded transition-colors ${
                              filters.starRating === option.value
                                ? 'bg-neutral-700 text-white font-medium'
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Topic Filter */}
                    <div>
                      <div className="px-6 py-2 bg-neutral-800">
                        <span className="text-white font-medium text-xs">Topic</span>
                      </div>
                      <div className="px-4 py-2">
                        {[
                          { value: 'all', label: 'All Topics' },
                          { value: 'Tech', label: 'Tech' },
                          { value: 'Finance', label: 'Finance' },
                          { value: 'Cooking', label: 'Cooking' },
                          { value: 'Entertainment', label: 'Entertainment' },
                          { value: 'School/Work', label: 'School/Work' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateFilter('topic', option.value)}
                            className={`w-full px-4 py-2 text-left text-sm rounded transition-colors ${
                              filters.topic === option.value
                                ? 'bg-neutral-700 text-white font-medium'
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                    {/* Top Left Icons */}
                    <div className="absolute top-2 left-2 z-10 flex gap-2">
                      {/* Archive Icon */}
                      <button
                        onClick={() => handleArchive(link.id)}
                        className="p-2 bg-black/70 hover:bg-black border border-white rounded-lg transition-colors group"
                        title={link.archived ? 'Unarchive' : 'Archive'}
                      >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>

                      {/* Star Rating Icon */}
                      <div className="relative rating-popup-container">
                        <button
                          onClick={() => setRatingPopupOpen(ratingPopupOpen === link.id ? null : link.id)}
                          className={`p-2 bg-black/70 hover:bg-black border border-white rounded-lg transition-colors ${link.rating ? 'text-yellow-400' : 'text-white'}`}
                          title={link.rating ? `Rated ${link.rating} stars` : 'Rate this link'}
                        >
                          <svg className="w-4 h-4" fill={link.rating ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>

                        {/* Rating Popup */}
                        {ratingPopupOpen === link.id && (
                          <div className="absolute top-full left-0 mt-1 bg-black border border-white rounded-lg shadow-lg p-3 whitespace-nowrap z-20">
                            <p className="text-white text-xs mb-2 font-medium">Rate this link:</p>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => handleRating(link.id, star)}
                                  className="p-1 hover:scale-110 transition-transform"
                                  title={`${star} star${star > 1 ? 's' : ''}`}
                                >
                                  <svg
                                    className={`w-5 h-5 ${star <= (link.rating || 0) ? 'text-yellow-400 fill-current' : 'text-white'}`}
                                    fill={star <= (link.rating || 0) ? 'currentColor' : 'none'}
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image preview - FIXED */}
                    <div className="w-full h-40 bg-neutral-900 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {link.thumbnail ? (
                        <img
                          src={link.thumbnail}
                          alt={link.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-neutral-800">
                                <svg class="w-12 h-12 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                              </div>
                            `
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
                              className="text-neutral-400 hover:text-white text-xs underline whitespace-nowrap inline"
                            >
                              See less
                            </button>
                          </div>
                        ) : (
                          <div className="text-white font-bold text-base whitespace-nowrap overflow-hidden flex items-center h-6">
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
                        <p className="text-neutral-400 text-sm">
                          {getDomain(link.url)}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-neutral-500 text-xs">
                            {getTimeAgo(link.createdAt)}
                          </p>
                          {link.rating && (
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-3 h-3 ${star <= link.rating ? 'text-yellow-400 fill-current' : 'text-neutral-600'}`}
                                  fill={star <= link.rating ? 'currentColor' : 'none'}
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              ))}
                            </div>
                          )}
                        </div>
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