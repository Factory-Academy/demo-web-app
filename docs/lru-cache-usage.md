# LRU Cache Usage Guide

## Overview

The `LRUCache` utility provides an in-memory cache with Least Recently Used (LRU) eviction policy and optional Time-To-Live (TTL) support. It's integrated into the `ItemService` to cache priority calculations.

## Basic Usage

### Creating a Cache

```typescript
import { LRUCache } from '@/utils/lru-cache'

// Simple cache with max 100 entries
const cache = new LRUCache({ maxSize: 100 })

// Cache with TTL (entries expire after 5 minutes)
const cacheWithTTL = new LRUCache({ 
  maxSize: 100, 
  ttlMs: 5 * 60 * 1000 
})
```

### Basic Operations

```typescript
// Set a value
cache.set('user:123', { name: 'Alice', age: 30 })

// Get a value
const user = cache.get('user:123')
console.log(user) // { name: 'Alice', age: 30 }

// Check if key exists
if (cache.has('user:123')) {
  console.log('User found in cache')
}

// Evict a specific key
cache.evict('user:123')

// Clear all entries
cache.clear()

// Get current size
console.log(`Cache size: ${cache.size}`)
```

### Custom TTL per Entry

```typescript
const cache = new LRUCache({ maxSize: 100, ttlMs: 60000 }) // Default 1 minute

// Override TTL for specific entry (5 seconds)
cache.set('temp-data', someValue, 5000)

// This entry expires in 5 seconds, others expire in 1 minute
```

## Integration with ItemService

The `ItemService` can use an LRU cache to optimize priority calculations:

```typescript
import { ItemService } from '@/services/item-service'
import { LRUCache } from '@/utils/lru-cache'
import { PriorityLevel } from '@/config/app-config'

// Create a cache for priority calculations
// - maxSize: 1000 items
// - ttlMs: 5 minutes (priorities may change over time as items age)
const priorityCache = new LRUCache<string, PriorityLevel>({
  maxSize: 1000,
  ttlMs: 5 * 60 * 1000,
})

// Create service with cache
const itemService = new ItemService({ priorityCache })

// Priority calculations are now cached
const item = {
  id: 'item-1',
  name: 'Important Task',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// First call: calculates and caches the priority
const priority1 = itemService.calculatePriority(item)

// Second call: returns cached result (O(1) operation)
const priority2 = itemService.calculatePriority(item)

// Without cache (for comparison)
const serviceNoCache = new ItemService()
const priority3 = serviceNoCache.calculatePriority(item) // Always calculates
```

## Performance Characteristics

- **get()**: O(1) average case
- **set()**: O(1) average case
- **evict()**: O(1) average case
- **clear()**: O(n) where n is cache size

## Cache Key Strategy

The `ItemService` creates cache keys from:
- Item ID
- Item status
- Item createdAt timestamp

This ensures:
1. Different items have different cache entries
2. Status changes invalidate the cache (urgent vs. normal priority)
3. The createdAt timestamp prevents stale data across different items

Example cache key: `item-123:active:2024-09-22T10:30:00.000Z`

## Best Practices

### 1. Choose Appropriate Cache Size

```typescript
// For small datasets
const smallCache = new LRUCache({ maxSize: 100 })

// For larger datasets
const largeCache = new LRUCache({ maxSize: 10000 })
```

### 2. Set TTL Based on Data Freshness

```typescript
// Fast-changing data (30 seconds)
const fastCache = new LRUCache({ maxSize: 100, ttlMs: 30000 })

// Slow-changing data (1 hour)
const slowCache = new LRUCache({ maxSize: 100, ttlMs: 3600000 })

// Static data (no TTL)
const staticCache = new LRUCache({ maxSize: 100 })
```

### 3. Use Type Parameters

```typescript
// Strongly typed cache
interface User {
  id: string
  name: string
  email: string
}

const userCache = new LRUCache<string, User>({ maxSize: 500 })

// TypeScript ensures type safety
userCache.set('user:1', { id: '1', name: 'Alice', email: 'alice@example.com' })
const user: User | undefined = userCache.get('user:1')
```

### 4. Monitor Cache Effectiveness

```typescript
const cache = new LRUCache({ maxSize: 100 })

let hits = 0
let misses = 0

function getCached(key: string) {
  const value = cache.get(key)
  if (value !== undefined) {
    hits++
  } else {
    misses++
  }
  return value
}

// Log cache hit rate
console.log(`Hit rate: ${(hits / (hits + misses) * 100).toFixed(2)}%`)
```

## Common Use Cases

### API Response Caching

```typescript
const apiCache = new LRUCache<string, any>({
  maxSize: 200,
  ttlMs: 5 * 60 * 1000, // 5 minutes
})

async function fetchWithCache(url: string) {
  const cached = apiCache.get(url)
  if (cached !== undefined) {
    return cached
  }

  const response = await fetch(url)
  const data = await response.json()
  apiCache.set(url, data)
  return data
}
```

### Computed Value Caching

```typescript
const computationCache = new LRUCache<string, number>({
  maxSize: 500,
})

function expensiveCalculation(input: string): number {
  const cacheKey = `calc:${input}`
  const cached = computationCache.get(cacheKey)
  
  if (cached !== undefined) {
    return cached
  }

  // Perform expensive calculation
  const result = /* ... */
  computationCache.set(cacheKey, result)
  return result
}
```

### User Session Caching

```typescript
interface Session {
  userId: string
  token: string
  expiresAt: number
}

const sessionCache = new LRUCache<string, Session>({
  maxSize: 1000,
  ttlMs: 30 * 60 * 1000, // 30 minutes
})

function getSession(sessionId: string): Session | undefined {
  return sessionCache.get(sessionId)
}

function createSession(sessionId: string, session: Session): void {
  // Custom TTL based on session expiration
  const ttl = session.expiresAt - Date.now()
  sessionCache.set(sessionId, session, ttl)
}
```
