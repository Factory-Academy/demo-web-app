import { Item } from '@/models/item'

interface ItemListProps {
  items: Item[]
  compact?: boolean
}

export function ItemList({ items, compact = false }: ItemListProps) {
  if (items.length === 0) {
    return <p className="text-gray-500">No items found.</p>
  }

  return (
    <ul className="divide-y">
      {items.map((item) => {
        const description = item.description?.trim()

        return (
          <li key={item.id} className={compact ? 'py-1' : 'py-3'}>
            <div className="flex justify-between">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-gray-500">{item.status}</span>
            </div>
            {!compact && description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
