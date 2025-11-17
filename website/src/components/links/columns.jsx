import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { getTimeAgo, getDomain, truncate } from '@/lib/link-utils'

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
    header: ({ column }) => {
      return (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-white transition-colors"
        >
          Title
          {column.getIsSorted() === 'asc' ? (
            <span className="text-xs">↑</span>
          ) : column.getIsSorted() === 'desc' ? (
            <span className="text-xs">↓</span>
          ) : (
            <span className="text-xs text-neutral-600">↕</span>
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      const title = row.getValue('title')
      const url = row.original.url
      return (
        <div className="flex flex-col gap-1.5 max-w-md">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-blue-400 transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {truncate(title, 60)}
          </a>
          <Badge variant="outline" className="text-xs w-fit">
            {getDomain(url)}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'url',
    header: ({ column }) => {
      return (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-white transition-colors"
        >
          URL
          {column.getIsSorted() === 'asc' ? (
            <span className="text-xs">↑</span>
          ) : column.getIsSorted() === 'desc' ? (
            <span className="text-xs">↓</span>
          ) : (
            <span className="text-xs text-neutral-600">↕</span>
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      const url = row.getValue('url')
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 hover:text-blue-400 transition-colors underline text-sm max-w-sm truncate block"
          onClick={(e) => e.stopPropagation()}
        >
          {truncate(url, 60)}
        </a>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-white transition-colors"
        >
          Saved
          {column.getIsSorted() === 'asc' ? (
            <span className="text-xs">↑</span>
          ) : column.getIsSorted() === 'desc' ? (
            <span className="text-xs">↓</span>
          ) : (
            <span className="text-xs text-neutral-600">↕</span>
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      const timestamp = row.getValue('createdAt')
      return (
        <div className="text-neutral-400 text-sm">{getTimeAgo(timestamp)}</div>
      )
    },
  },
]
