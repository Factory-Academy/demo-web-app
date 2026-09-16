import { Item } from '@/models/item'

interface ItemListProps {
  items: Item[]
  compact?: boolean
}

export function ItemList({ items, compact }: ItemListProps) {
  if (items.length === 0) {
    return <p className="text-gray-500">No items found.</p>
  }

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className={compact ? 'py-2' : 'py-3'}>
          <div className="flex justify-between">
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-gray-500">{item.status}</span>
          </div>
          {!compact && item.description && (
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
