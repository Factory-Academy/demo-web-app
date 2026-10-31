import { Item, ItemCreate } from '@/models/item'

type Operation<T> = () => Promise<T>

/**
 * Serializes access to shared item state to prevent race conditions.
 * All operations on items are queued and executed sequentially.
 */
export class ItemQueueService {
  private items: Item[] = []
  private nextId = 1
  private operationQueue: Array<() => Promise<void>> = []
  private isProcessing = false

  /**
   * Get all items (non-mutating, returns a copy)
   */
  async getAll(): Promise<Item[]> {
    return this.enqueueOperation(async () => {
      return [...this.items]
    })
  }

  /**
   * Add a new item with a unique ID (mutating)
   */
  async create(data: ItemCreate): Promise<Item> {
    return this.enqueueOperation(async () => {
      const item: Item = {
        ...data,
        status: data.status || 'pending',
        id: String(this.nextId++),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.items.push(item)
      return item
    })
  }

  /**
   * Enqueues an operation to be executed serially, ensuring no concurrent access
   * to the shared items state.
   */
  private async enqueueOperation<T>(operation: Operation<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push(async () => {
        try {
          const result = await operation()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  /**
   * Processes the operation queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      while (this.operationQueue.length > 0) {
        const operation = this.operationQueue.shift()
        if (operation) {
          await operation()
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Reset the service state (for testing)
   */
  reset(): void {
    this.items = []
    this.nextId = 1
    this.operationQueue = []
    this.isProcessing = false
  }
}

// Export singleton instance
export const itemQueueService = new ItemQueueService()
