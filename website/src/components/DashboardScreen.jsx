import { useState, useEffect } from 'react'
import { signOut } from '@/lib/auth'
import {
  loadLinksFromFirestore,
  deleteLinkFromFirestore,
  deleteMultipleLinks,
} from '@/lib/firestore-service'
import { DataTable } from '@/components/links/data-table'
import { columns } from '@/components/links/columns'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export function DashboardScreen({ storageChoice, user }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

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

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.reload()
    } catch (error) {
      // Silent failure - page will reload anyway
    }
  }

  const handleBulkDelete = async (linkIds) => {
    try {
      await deleteMultipleLinks(user.uid, linkIds)
      setLinks((prev) => prev.filter((link) => !linkIds.includes(link.id)))
      toast.success(`Deleted ${linkIds.length} link${linkIds.length === 1 ? '' : 's'}`)
    } catch (error) {
      console.error('Error bulk deleting links:', error)
      toast.error('Failed to delete links')
    }
  }

  return (
    <div className="min-h-screen p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header with user info */}
        {user && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <img
                src={user.photoURL || 'https://via.placeholder.com/48'}
                alt="Profile"
                className="w-12 h-12 rounded-full border-2 border-neutral-700"
              />
              <div>
                <p className="text-white font-medium">
                  {user.displayName || 'User'}
                </p>
                <p className="text-neutral-500 text-sm">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-serif text-white tracking-tight">
              Saved Links
            </h1>
            <p className="text-neutral-500">
              Manage your saved links from the extension
            </p>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={links}
              onBulkDelete={handleBulkDelete}
            />
          )}
        </div>
      </div>
    </div>
  )
}
