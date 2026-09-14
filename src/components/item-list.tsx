import { Item } from '@/models/item'

interface ItemListProps {
  items: Item[]
  compact?: boolean
}

export function ItemList({ items, compact = false }: ItemListProps) {
  if (items.length === 0) {
    return <p className="text-gray-500">No items found.</p>
  }

  if (compact) {
    return (
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.id} className="py-1 flex justify-between items-center">
            <span className="text-sm">{item.name}</span>
            <span className="text-xs text-gray-500">{item.status}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="py-3">
          <div className="flex justify-between">
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-gray-500">{item.status}</span>
          </div>
          {item.description && (
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
