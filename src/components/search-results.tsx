'use client'
import { useState } from 'react'
import { Item } from '@/models/item'

interface SearchResultsProps {
  items: Item[]
}

export function SearchResults({ items }: SearchResultsProps) {
  const [query, setQuery] = useState('')

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items..."
        className="border p-2 rounded w-full mb-4"
      />
      <ul className="divide-y">
        {filtered.map((item) => (
          <li key={item.id} className="py-3">
            <div dangerouslySetInnerHTML={{ __html: item.name }} />
            <p className="text-sm text-gray-600">{item.description}</p>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="text-gray-500">No results for "{query}"</p>
      )}
    </div>
  )
}
