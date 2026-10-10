import Dexie, { liveQuery, type EntityTable } from 'dexie'
import { RESOURCE_STATUSES, type Resource, type ResourceStatus } from '../../types/resource.ts'
import type { ResourceChanges, StatusCounts, StorageAdapter } from './StorageAdapter.ts'

const db = new Dexie('devinbox') as Dexie & {
  resources: EntityTable<Resource, 'id'>
}

db.version(1).stores({
  resources: 'id, &url, status, [status+createdAt], *tags, updatedAt, enrichStatus',
})

const isAlive = (resource: Resource) => !resource.deletedAt

function byStatus(status: ResourceStatus) {
  return db.resources.where('[status+createdAt]').between([status, Dexie.minKey], [status, Dexie.maxKey])
}

export const dexieAdapter: StorageAdapter = {
  observeByStatus(status, onChange, onError) {
    const subscription = liveQuery(() => byStatus(status).reverse().filter(isAlive).toArray()).subscribe({
      next: onChange,
      error: onError,
    })
    return () => subscription.unsubscribe()
  },

  observeCounts(onChange) {
    const subscription = liveQuery(async () => {
      const entries = await Promise.all(
        RESOURCE_STATUSES.map(async (status) => [status, await byStatus(status).filter(isAlive).count()] as const),
      )
      return Object.fromEntries(entries) as StatusCounts
    }).subscribe({ next: onChange })
    return () => subscription.unsubscribe()
  },

  get: (id) => db.resources.get(id),

  findByUrl: (url) => db.resources.where('url').equals(url).first(),

  async existingUrls(urls) {
    const found = await db.resources.where('url').anyOf(urls).toArray()
    return new Set(found.map((resource) => resource.url))
  },

  pendingEnrichment: () => db.resources.where('enrichStatus').equals('pending').filter(isAlive).toArray(),

  async add(resource) {
    await db.resources.add(resource)
  },

  async bulkAdd(resources) {
    await db.resources.bulkAdd(resources)
  },

  async update(id, changes: ResourceChanges) {
    await db.resources.update(id, { ...changes, updatedAt: new Date().toISOString() })
  },

  async remove(id) {
    const now = new Date().toISOString()
    await db.resources.update(id, { deletedAt: now, updatedAt: now })
  },

  async restore(id) {
    await db.resources.update(id, { deletedAt: undefined, updatedAt: new Date().toISOString() })
  },
}
