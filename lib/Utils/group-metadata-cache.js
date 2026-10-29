import { LRUCache } from 'lru-cache'

const isRateOverlimitError = err => err?.data === 429 || err?.message === 'rate-overlimit'

export const makeGroupMetadataCache = ({ fetch, external, logger, ttlSeconds, maxEntries = 128, retryDelaysMs = [1000, 2500] }) => {
	const cache = new LRUCache({ max: maxEntries, ttl: ttlSeconds * 1000 })
	const inflight = new Map()
	let closed = false
	let trustExternal = true
	const invalidatePending = jid => {
		const entry = inflight.get(jid)
		if (entry) {
			entry.invalidated = true
			inflight.delete(jid)
		}
	}
	const fetchWithRetry = async jid => {
		for (let attempt = 0; ; attempt++) {
			if (closed) throw new Error('Group metadata cache is closed')
			try {
				return await fetch(jid)
			} catch (err) {
				const delay = retryDelaysMs[attempt]
				if (!isRateOverlimitError(err) || delay === undefined) throw err
				logger.warn({ jid, attempt, delay }, 'group metadata query rate limited, retrying')
				await new Promise(resolve => setTimeout(resolve, delay))
			}
		}
	}
	const get = async (jid, { fresh = false } = {}) => {
		if (closed) throw new Error('Group metadata cache is closed')
		if (!fresh) {
			const metadata = cache.get(jid)
			if (metadata) return metadata
		}
		const pending = inflight.get(jid)
		if (pending && (!fresh || pending.fresh)) return pending.promise
		if (pending) invalidatePending(jid)
		const entry = { fresh, invalidated: false, promise: null }
		entry.promise = Promise.resolve().then(async () => {
			if (!fresh && external && trustExternal) {
				const metadata = await external(jid)
				if (metadata && Array.isArray(metadata.participants)) return metadata
			}
			const metadata = await fetchWithRetry(jid)
			trustExternal = false
			return metadata
		}).then(metadata => {
			if (closed) return metadata
			if (entry.invalidated) return cache.get(jid) || get(jid, { fresh: true })
			cache.set(jid, metadata)
			return metadata
		}).finally(() => {
			if (inflight.get(jid) === entry) inflight.delete(jid)
		})
		inflight.set(jid, entry)
		return entry.promise
	}
	return {
		get,
		remember: metadata => {
			if (closed) return
			trustExternal = false
			invalidatePending(metadata.id)
			cache.set(metadata.id, metadata)
		},
		invalidate: jid => {
			trustExternal = false
			cache.delete(jid)
			invalidatePending(jid)
		},
		peek: jid => cache.get(jid),
		close: () => {
			closed = true
			cache.clear()
			inflight.clear()
		}
	}
}
