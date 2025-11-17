import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DataTableRowActions } from './data-table-row-actions'

/**
 * Format timestamp to "2d ago" style
 */
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago'
  if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago'
  return Math.floor(seconds / 2592000) + 'mo ago'
}

/**
 * Extract domain from URL
 */
function getDomain(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch (e) {
    return url
  }
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const columns = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => {
      const title = row.getValue('title')
      return (
        <div className="flex flex-col gap-1 max-w-md">
          <div className="font-medium">{truncate(title, 60)}</div>
          <div className="text-xs text-neutral-500 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getDomain(row.original.url)}
            </Badge>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }) => {
      const url = row.getValue('url')
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 hover:text-white transition-colors underline text-sm max-w-xs truncate block"
          onClick={(e) => e.stopPropagation()}
        >
          {truncate(url, 50)}
        </a>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Saved',
    cell: ({ row }) => {
      const timestamp = row.getValue('createdAt')
      return (
        <div className="text-neutral-500 text-sm">{getTimeAgo(timestamp)}</div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
