import { useState, useEffect } from 'react'
import { signOut } from '@/lib/auth'
import { loadLinksFromFirestore } from '@/lib/firestore-service'

export function StatsScreen({ user, onBack }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [displayedTitle, setDisplayedTitle] = useState('')
  const fullTitle = 'Statistics.'

  useEffect(() => {
    if (!user) return

    async function fetchLinks() {
      try {
        const linksData = await loadLinksFromFirestore(user.uid)
        setLinks(linksData)
      } catch (error) {
        console.error('Error fetching links:', error)
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
    }, 100)

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

  const getDomain = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '')
      return domain
    } catch {
      return 'Unknown'
    }
  }

  const classifyTopic = (link) => {
    const title = link.title.toLowerCase()
    const url = link.url.toLowerCase()

    if (title.match(/\b(code|programming|software|developer|tech|computer|ai|machine learning|javascript|python|react|github|api|database|server|web|app|mobile|ios|android|cloud|aws|google cloud|azure|docker|kubernetes|linux|windows|mac|crypto|blockchain|bitcoin|ethereum)\b/) ||
        url.match(/stackoverflow|github|dev\.to|medium\.com\/.*tech|techcrunch|arstechnica|theverge|wired\.com|cnet\.com/)) {
      return 'Tech'
    }
    if (title.match(/\b(stock|invest|trading|finance|money|bank|crypto|bitcoin|ethereum|portfolio|401k|retirement|savings|mortgage|loan|credit|debt|tax|budget|wealth|market|economy|dividend|bond|forex)\b/) ||
        url.match(/bloomberg|cnbc|marketwatch|investopedia|wallstreetjournal|finance\.yahoo|nerdwallet|mint\.com/)) {
      return 'Finance'
    }
    if (title.match(/\b(recipe|cook|bake|food|chef|kitchen|meal|dish|ingredient|cuisine|diet|nutrition|restaurant|dessert|breakfast|lunch|dinner|appetizer|sauce|spice|oven|grill|fry|boil|healthy eating)\b/) ||
        url.match(/allrecipes|foodnetwork|epicurious|seriouseats|bonappetit|tasty\.co|delish\.com|food52/)) {
      return 'Cooking'
    }
    if (title.match(/\b(movie|film|tv show|series|netflix|hulu|disney|hbo|streaming|music|song|album|artist|band|concert|game|gaming|playstation|xbox|nintendo|esports|anime|manga|comic|marvel|dc|star wars|lord of the rings|podcast|youtube|twitch|celebrity|actor|actress)\b/) ||
        url.match(/imdb|rottentomatoes|netflix|hulu|spotify|apple music|twitch\.tv|ign\.com|gamespot|polygon\.com|kotaku|entertainment\.com/)) {
      return 'Entertainment'
    }
    if (title.match(/\b(essay|research|study|homework|assignment|course|class|lecture|professor|student|education|university|college|school|degree|certification|exam|test|project|paper|thesis|dissertation|career|job|resume|interview|linkedin|professional|office|meeting|presentation|deadline|workload)\b/) ||
        url.match(/coursera|udemy|khanacademy|edx|scholar\.google|researchgate|linkedin\.com|indeed\.com|glassdoor/)) {
      return 'School/Work'
    }
    return 'Other'
  }

  // Calculate statistics
  const totalLinks = links.length
  const archivedLinks = links.filter(link => link.archived).length
  const ratedLinks = links.filter(link => link.rating).length
  const averageRating = ratedLinks > 0
    ? (links.reduce((sum, link) => sum + (link.rating || 0), 0) / ratedLinks).toFixed(1)
    : 0

  // Domain breakdown
  const domainCounts = {}
  links.forEach(link => {
    const domain = getDomain(link.url)
    domainCounts[domain] = (domainCounts[domain] || 0) + 1
  })
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Topic breakdown
  const topicCounts = {}
  links.forEach(link => {
    const topic = classifyTopic(link)
    topicCounts[topic] = (topicCounts[topic] || 0) + 1
  })

  // Rating breakdown
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, unrated: 0 }
  links.forEach(link => {
    if (link.rating) {
      ratingCounts[link.rating]++
    } else {
      ratingCounts.unrated++
    }
  })

  return (
    <div className="min-h-screen bg-black" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      {/* Black top bar */}
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

          {/* Right - Back button */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-white hover:text-neutral-300 transition-colors"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl text-white font-medium mb-8">Your Statistics</h2>

          {loading ? (
            <div className="text-white text-center py-16">Loading statistics...</div>
          ) : (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-black border border-white rounded-xl p-6">
                  <p className="text-neutral-400 text-sm mb-2">Total Links</p>
                  <p className="text-white text-4xl font-bold">{totalLinks}</p>
                </div>
                <div className="bg-black border border-white rounded-xl p-6">
                  <p className="text-neutral-400 text-sm mb-2">Archived</p>
                  <p className="text-white text-4xl font-bold">{archivedLinks}</p>
                </div>
                <div className="bg-black border border-white rounded-xl p-6">
                  <p className="text-neutral-400 text-sm mb-2">Rated Links</p>
                  <p className="text-white text-4xl font-bold">{ratedLinks}</p>
                </div>
                <div className="bg-black border border-white rounded-xl p-6">
                  <p className="text-neutral-400 text-sm mb-2">Average Rating</p>
                  <p className="text-white text-4xl font-bold">{averageRating}</p>
                </div>
              </div>

              {/* Top Domains */}
              <div className="bg-black border border-white rounded-xl p-6">
                <h3 className="text-white text-2xl font-medium mb-4">Top Domains</h3>
                <div className="space-y-3">
                  {topDomains.length > 0 ? (
                    topDomains.map(([domain, count]) => (
                      <div key={domain} className="flex items-center justify-between">
                        <span className="text-neutral-300">{domain}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-48 bg-neutral-800 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-white h-full rounded-full"
                              style={{ width: `${(count / totalLinks) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white font-medium w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-neutral-500">No links saved yet</p>
                  )}
                </div>
              </div>

              {/* Topics and Ratings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Topics */}
                <div className="bg-black border border-white rounded-xl p-6">
                  <h3 className="text-white text-2xl font-medium mb-4">Topics</h3>
                  <div className="space-y-3">
                    {Object.entries(topicCounts).map(([topic, count]) => (
                      <div key={topic} className="flex items-center justify-between">
                        <span className="text-neutral-300">{topic}</span>
                        <span className="text-white font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ratings */}
                <div className="bg-black border border-white rounded-xl p-6">
                  <h3 className="text-white text-2xl font-medium mb-4">Rating Distribution</h3>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map(rating => (
                      <div key={rating} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-300">{rating} stars</span>
                          <div className="flex">
                            {[...Array(rating)].map((_, i) => (
                              <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <span className="text-white font-medium">{ratingCounts[rating]}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300">Unrated</span>
                      <span className="text-white font-medium">{ratingCounts.unrated}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
