import assert from 'node:assert/strict'
import test from 'node:test'
import { makeCacheableSignalKeyStore } from '../lib/Utils/auth-utils.js'

const memoryStore = () => {
	const records = new Map()
	const reads = []
	return {
		records, reads,
		async get(type, ids) {
			reads.push([...ids])
			return Object.fromEntries(ids.filter(id => records.has(`${type}.${id}`)).map(id => [id, records.get(`${type}.${id}`)]))
		},
		async set(data) {
			for (const [type, values] of Object.entries(data)) {
				for (const [id, value] of Object.entries(values)) {
					if (value === null) records.delete(`${type}.${id}`)
					else records.set(`${type}.${id}`, value)
				}
			}
		},
		async clear() { records.clear() }
	}
}

test('duplicate key requests are fetched from storage only once per batch', async () => {
	const store = memoryStore()
	await store.set({ session: { a: Buffer.from('one') } })
	const cache = makeCacheableSignalKeyStore(store)
	assert.deepEqual(await cache.get('session', ['a', 'a', 'missing', 'missing']), { a: Buffer.from('one') })
	assert.deepEqual(store.reads, [['a', 'missing']])
	assert.deepEqual(await cache.get('session', ['a']), { a: Buffer.from('one') })
	assert.equal(store.reads.length, 1)
})

test('a rejected durable write never exposes uncommitted keys through the cache', async () => {
	const store = memoryStore()
	await store.set({ session: { a: Buffer.from('original') } })
	const cache = makeCacheableSignalKeyStore({ ...store, set: async () => { throw new Error('disk full') } })
	await cache.get('session', ['a'])
	await assert.rejects(cache.set({ session: { a: Buffer.from('uncommitted') } }), /disk full/)
	assert.deepEqual(await cache.get('session', ['a']), { a: Buffer.from('original') })
})

test('default cache eviction reloads from authoritative storage', async () => {
	const store = memoryStore()
	const values = Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [String(i), Buffer.from(String(i))]))
	await store.set({ session: values })
	const cache = makeCacheableSignalKeyStore(store)
	await cache.get('session', Object.keys(values))
	assert.deepEqual(await cache.get('session', ['0']), { 0: Buffer.from('0') })
	assert.equal(store.reads.length, 2)
})

test('clear waits for outstanding reads so they cannot repopulate a cleared cache', async () => {
	let release
	const gate = new Promise(resolve => { release = resolve })
	let cleared = false
	const cache = makeCacheableSignalKeyStore({
		async get() { await gate; return cleared ? {} : { a: Buffer.from('stored') } },
		async set() {},
		async clear() { cleared = true }
	})
	const read = cache.get('session', ['a'])
	await Promise.resolve()
	const clear = cache.clear()
	await Promise.resolve()
	assert.equal(cleared, false)
	release()
	await Promise.all([read, clear])
	assert.deepEqual(await cache.get('session', ['a']), {})
})

test('injected asynchronous caches retain get, set, deletion and clear behavior', async () => {
	const store = memoryStore()
	const entries = new Map()
	const external = { get: async key => entries.get(key), set: async (key, value) => entries.set(key, value), flushAll: async () => entries.clear() }
	const cache = makeCacheableSignalKeyStore(store, undefined, external)
	await cache.set({ session: { a: Buffer.from('value') } })
	assert.deepEqual(await cache.get('session', ['a']), { a: Buffer.from('value') })
	await cache.set({ session: { a: null } })
	assert.deepEqual(await cache.get('session', ['a']), { a: null })
	await cache.clear()
	assert.equal(entries.size, 0)
	assert.deepEqual(await cache.get('session', ['a']), {})
})

test('an injected cache failure after persistence cannot serve stale Signal keys', async () => {
	const store = memoryStore()
	await store.set({ session: { a: Buffer.from('old') } })
	const entries = new Map([['session.a', Buffer.from('old')]])
	let fail = true
	const external = {
		get: async key => entries.get(key),
		set: async (key, value) => { if (fail) throw new Error('cache unavailable'); entries.set(key, value) },
		flushAll: async () => entries.clear()
	}
	const cache = makeCacheableSignalKeyStore(store, undefined, external)
	await assert.rejects(cache.set({ session: { a: Buffer.from('new') } }), /cache unavailable/)
	assert.deepEqual(await cache.get('session', ['a']), { a: Buffer.from('new') })
	await cache.set({ session: { a: Buffer.from('newer') } })
	assert.deepEqual(await cache.get('session', ['a']), { a: Buffer.from('newer') })
	fail = false
	await cache.clear()
	await cache.set({ session: { a: Buffer.from('recovered') } })
	assert.deepEqual(await cache.get('session', ['a']), { a: Buffer.from('recovered') })
})

test('an injected cache flush failure cannot restore data deleted from storage', async () => {
	const store = memoryStore()
	await store.set({ session: { a: Buffer.from('old') } })
	const cache = makeCacheableSignalKeyStore(store, undefined, { get: async () => Buffer.from('old'), set: async () => {}, flushAll: async () => { throw new Error('flush failed') } })
	await assert.rejects(cache.clear(), /flush failed/)
	assert.deepEqual(await cache.get('session', ['a']), {})
})

test('explicit invalidation reloads a key changed by an external storage writer', async () => {
	const store = memoryStore()
	await store.set({ session: { a: Buffer.from('old'), b: Buffer.from('unchanged') } })
	const cache = makeCacheableSignalKeyStore(store)
	await cache.get('session', ['a', 'b'])
	await store.set({ session: { a: Buffer.from('new') } })
	await cache.invalidate('session', ['a'])
	assert.deepEqual(await cache.get('session', ['a', 'b']), { a: Buffer.from('new'), b: Buffer.from('unchanged') })
	assert.deepEqual(store.reads, [['a', 'b'], ['a']])
})

test('invalidation flushes injected caches that cannot remove individual entries', async () => {
	const store = memoryStore()
	await store.set({ session: { a: Buffer.from('old') } })
	const entries = new Map()
	const cache = makeCacheableSignalKeyStore(store, undefined, { get: async key => entries.get(key), set: async (key, value) => entries.set(key, value), flushAll: async () => entries.clear() })
	await cache.get('session', ['a'])
	await store.set({ session: { a: Buffer.from('new') } })
	await cache.invalidate('session', ['a'])
	assert.deepEqual(await cache.get('session', ['a']), { a: Buffer.from('new') })
})

test('singular asynchronous del implementations invalidate each key separately', async () => {
	const store = memoryStore()
	const entries = new Map()
	const cache = makeCacheableSignalKeyStore(store, undefined, {
		get: async key => entries.get(key),
		set: async (key, value) => entries.set(key, value),
		del: async key => entries.delete(key),
		flushAll: async () => entries.clear()
	})
	await cache.set({ session: { a: Buffer.from('old-a'), b: Buffer.from('old-b') } })
	await store.set({ session: { a: Buffer.from('new-a'), b: Buffer.from('new-b') } })
	await cache.invalidate('session', ['a', 'b'])
	assert.deepEqual(await cache.get('session', ['a', 'b']), { a: Buffer.from('new-a'), b: Buffer.from('new-b') })
})
