import { Item } from '@/models/item'
import { UI_LABELS } from '@/config/constants'

interface ItemListProps {
  items: Item[]
}

export function ItemList({ items }: ItemListProps) {
  if (items.length === 0) {
    return <p className={UI_LABELS.NO_ITEMS_FOUND_CLASS}>{UI_LABELS.NO_ITEMS_FOUND}</p>
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
