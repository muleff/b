import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as wait } from 'node:timers/promises'
import { makeGroupMetadataCache } from '../lib/Utils/group-metadata-cache.js'

const logger = { warn() {} }
const metadata = id => ({ id, participants: [{ id: '12345@s.whatsapp.net' }] })
const rateLimit = () => Object.assign(new Error('rate-overlimit'), { data: 429 })

test('concurrent group lookups share one request and subsequent cache hits do not fetch', async () => {
	let reads = 0
	const cache = makeGroupMetadataCache({ fetch: async id => { reads++; await wait(1); return metadata(id) }, logger, ttlSeconds: 300 })
	const results = await Promise.all(Array.from({ length: 20 }, () => cache.get('group')))
	assert.equal(reads, 1)
	assert.ok(results.every(value => value === results[0]))
	assert.deepEqual(await cache.get('group'), metadata('group'))
	assert.equal(reads, 1)
	cache.close()
})

test('external metadata bootstraps a miss while a fresh request bypasses it', async () => {
	let reads = 0
	const external = { ...metadata('group'), subject: 'external' }
	const cache = makeGroupMetadataCache({ fetch: async id => { reads++; return metadata(id) }, external: async () => external, logger, ttlSeconds: 300 })
	assert.equal(await cache.get('group'), external)
	await cache.get('group', { fresh: true })
	assert.equal(reads, 1)
	cache.close()
})

test('expired metadata is never returned when the refresh is rate limited', async () => {
	let reads = 0
	const cache = makeGroupMetadataCache({ fetch: async id => { if (++reads > 1) throw rateLimit(); return metadata(id) }, logger, ttlSeconds: 0.001, retryDelaysMs: [] })
	await cache.get('group')
	await wait(15)
	await assert.rejects(cache.get('group'), /rate-overlimit/)
	assert.equal(reads, 2)
	cache.close()
})

test('metadata eviction and forced refresh never serve an older cached group', async () => {
	let failed = false
	const cache = makeGroupMetadataCache({ fetch: async id => { if (failed) throw rateLimit(); return metadata(id) }, logger, ttlSeconds: 300, maxEntries: 2, retryDelaysMs: [] })
	for (const id of ['one', 'two', 'three']) await cache.get(id)
	assert.equal(cache.peek('one'), undefined)
	failed = true
	await assert.rejects(cache.get('one'), /rate-overlimit/)
	await assert.rejects(cache.get('three', { fresh: true }), /rate-overlimit/)
	cache.close()
})

test('invalidation removes the old metadata and causes a refetch', async () => {
	let reads = 0
	const cache = makeGroupMetadataCache({ fetch: async id => { reads++; return metadata(id) }, logger, ttlSeconds: 300 })
	await cache.get('group')
	cache.invalidate('group')
	assert.equal(cache.peek('group'), undefined)
	await cache.get('group')
	assert.equal(reads, 2)
	cache.close()
})

test('closing during a request prevents late cache repopulation', async () => {
	let finish
	const pending = new Promise(resolve => { finish = resolve })
	const cache = makeGroupMetadataCache({ fetch: () => pending, logger, ttlSeconds: 300 })
	const lookup = cache.get('group')
	await Promise.resolve()
	cache.close()
	finish(metadata('group'))
	await lookup
	assert.equal(cache.peek('group'), undefined)
	await assert.rejects(cache.get('group'), /closed/)
})

test('non-rate-limit failures propagate and a later lookup can retry', async () => {
	let failed = true
	const cache = makeGroupMetadataCache({ fetch: async id => { if (failed) throw new Error('network failure'); return metadata(id) }, logger, ttlSeconds: 300 })
	await assert.rejects(cache.get('group'), /network failure/)
	failed = false
	assert.deepEqual(await cache.get('group'), metadata('group'))
	cache.close()
})

test('participant invalidation cannot return the old group when the refresh is rate limited', async () => {
	let blocked = false
	const cache = makeGroupMetadataCache({ fetch: async id => { if (blocked) throw rateLimit(); return metadata(id) }, logger, ttlSeconds: 300, retryDelaysMs: [] })
	await cache.get('group')
	cache.invalidate('group')
	blocked = true
	await assert.rejects(cache.get('group'), /rate-overlimit/)
	cache.close()
})

test('an invalidated in-flight lookup refetches rather than returning or caching its old participants', async () => {
	let finish
	let reads = 0
	const old = { ...metadata('group'), subject: 'old' }
	const current = { ...metadata('group'), subject: 'new' }
	const cache = makeGroupMetadataCache({ fetch: async () => { if (++reads === 1) return new Promise(resolve => { finish = resolve }); return current }, logger, ttlSeconds: 300 })
	const lookup = cache.get('group')
	await Promise.resolve()
	cache.invalidate('group')
	finish(old)
	assert.equal((await lookup).subject, 'new')
	assert.equal((await cache.get('group')).subject, 'new')
	assert.equal(reads, 2)
	cache.close()
})

test('locally updated participants replace an older in-flight result and external cached copy', async () => {
	let finish
	const old = { ...metadata('group'), subject: 'old' }
	const current = { ...metadata('group'), subject: 'new' }
	const cache = makeGroupMetadataCache({ external: async () => old, fetch: async () => new Promise(resolve => { finish = resolve }), logger, ttlSeconds: 300 })
	const lookup = cache.get('group', { fresh: true })
	await Promise.resolve()
	cache.remember(current)
	finish(old)
	assert.equal((await lookup).subject, 'new')
	assert.equal((await cache.get('group')).subject, 'new')
	cache.close()
})

test('an external stale copy is bypassed after invalidation even when the local entry expires', async () => {
	let reads = 0
	const old = { ...metadata('group'), subject: 'old' }
	const current = { ...metadata('group'), subject: 'new' }
	const cache = makeGroupMetadataCache({ external: async () => old, fetch: async () => { reads++; return current }, logger, ttlSeconds: 0.001 })
	assert.equal((await cache.get('group')).subject, 'old')
	cache.invalidate('group')
	assert.equal((await cache.get('group')).subject, 'new')
	await wait(15)
	assert.equal((await cache.get('group')).subject, 'new')
	assert.equal(reads, 2)
	cache.close()
})

test('a forced network refresh cannot later fall back to an older external snapshot', async () => {
	const old = { ...metadata('group'), subject: 'old' }
	const current = { ...metadata('group'), subject: 'new' }
	const cache = makeGroupMetadataCache({ external: async () => old, fetch: async () => current, logger, ttlSeconds: 0.001 })
	assert.equal((await cache.get('group')).subject, 'old')
	assert.equal((await cache.get('group', { fresh: true })).subject, 'new')
	await wait(15)
	assert.equal((await cache.get('group')).subject, 'new')
	cache.close()
})
