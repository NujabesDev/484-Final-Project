import { ArrowUpDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const title = row.getValue('title')
      const url = row.original.url
      return (
        <div className="flex flex-col gap-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {truncate(title, 60)}
          </a>
          <Badge variant="secondary" className="text-xs w-fit">
            {getDomain(url)}
          </Badge>
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
          className="text-sm hover:underline truncate block max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {truncate(url, 60)}
        </a>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Saved
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const timestamp = row.getValue('createdAt')
      return <div className="text-sm">{getTimeAgo(timestamp)}</div>
    },
  },
]
