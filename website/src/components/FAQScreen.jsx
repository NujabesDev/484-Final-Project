import { useState, useEffect } from 'react'
import { signOut } from '@/lib/auth'

export function FAQScreen({ user, onBack }) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [expandedQuestions, setExpandedQuestions] = useState(new Set())
  const fullTitle = 'FAQ'

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

  const toggleQuestion = (index) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const faqs = [
    {
      question: "How do I save a link?",
      answer: "You can save links using our browser extension. Simply click the extension icon and choose 'Save Current Page' to add the current webpage to your reading list."
    },
    {
      question: "Can I organize my saved links?",
      answer: "Yes! You can sort links alphabetically, by date, or by rating. You can also filter by domain (Reddit, YouTube, Articles), date saved, star rating, and topic categories."
    },
    {
      question: "What is the Archive feature?",
      answer: "The Archive feature allows you to move links you've read or no longer need to a separate view without deleting them. Click the Archive button to toggle between your active and archived links."
    },
    {
      question: "How does the star rating system work?",
      answer: "You can rate any saved link from 1 to 5 stars. Click the star icon on any link card to open the rating popup and select your rating. This helps you prioritize and filter your most valuable content."
    },
    {
      question: "What are the topic categories?",
      answer: "Links are automatically classified into categories (Tech, Finance, Cooking, Entertainment, School/Work) based on keywords in the title and domain. This happens automatically to help you filter your content."
    },
    {
      question: "Can I use this on multiple devices?",
      answer: "Yes! All your links are synced through your Google account via Firebase. Sign in on any device to access your saved links."
    },
    {
      question: "How do I delete a link?",
      answer: "Each link card has a Delete button at the bottom. You can also click 'Open' to open the link in a new tab and automatically delete it from your list."
    },
    {
      question: "What is Productivity Mode?",
      answer: "Productivity Mode (available in the browser extension) prevents impulsive clicking by automatically saving Reddit and YouTube links instead of navigating to them immediately."
    },
    {
      question: "How do I search my saved links?",
      answer: "Use the search bar at the top of the dashboard to search by title or URL. The results update in real-time as you type."
    },
    {
      question: "Can I export my links?",
      answer: "Currently, link export is not available, but all your data is stored in Firebase and accessible through your Google account."
    }
  ]

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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl text-white font-medium mb-8">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isExpanded = expandedQuestions.has(index)

              return (
                <div
                  key={index}
                  className="bg-black border border-white rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleQuestion(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-neutral-900 transition-colors"
                  >
                    <span className="text-white font-medium text-lg">{faq.question}</span>
                    <svg
                      className={`w-6 h-6 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-4 pt-2 border-t border-neutral-700">
                      <p className="text-neutral-300 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Additional Help Section */}
          <div className="mt-12 bg-black border border-white rounded-xl p-6">
            <h3 className="text-white text-2xl font-medium mb-3">Still need help?</h3>
            <p className="text-neutral-300 mb-4">
              If you couldn't find the answer you're looking for, feel free to reach out to our support team.
            </p>
            <button
              onClick={() => window.open('https://github.com/anthropics/claude-code/issues', '_blank')}
              className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-neutral-200 transition-colors"
            >
              Request Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
