import NodeCache from '@cacheable/node-cache';
import { delay } from './generics.js';

export const isRateOverlimitError = (err) => {
    const boom = err;
    return boom?.data === 429 || boom?.message === 'rate-overlimit';
};

export const makeGroupMetadataCache = ({ fetch, external, logger, ttlSeconds, retryDelaysMs = [1000, 2500] }) => {
    const cache = new NodeCache({ stdTTL: ttlSeconds, useClones: false });
    const lastKnown = new Map();
    const inflight = new Map();

    const remember = (metadata) => {
        cache.set(metadata.id, metadata);
        lastKnown.set(metadata.id, metadata);
    };

    const fetchHandlingRateLimit = async (jid) => {
        for (let attempt = 0;; attempt++) {
            try {
                return await fetch(jid);
            }
            catch (err) {
                if (!isRateOverlimitError(err)) {
                    throw err;
                }
                const fallback = lastKnown.get(jid);
                if (fallback) {
                    logger.warn({ jid }, 'group metadata query rate limited, serving last known copy');
                    return fallback;
                }
                const wait = retryDelaysMs[attempt];
                if (wait === undefined) {
                    throw err;
                }
                logger.warn({ jid, attempt, wait }, 'group metadata query rate limited, retrying');
                await delay(wait);
            }
        }
    };

    const get = async (jid, { fresh = false } = {}) => {
        if (!fresh) {
            const fromExternal = external ? await external(jid) : undefined;
            if (fromExternal && Array.isArray(fromExternal.participants)) {
                return fromExternal;
            }
            const cached = cache.get(jid);
            if (cached) {
                return cached;
            }
        }
        const pending = inflight.get(jid);
        if (pending) {
            return pending;
        }
        const promise = fetchHandlingRateLimit(jid)
            .then(metadata => {
            remember(metadata);
            return metadata;
        })
            .finally(() => {
            inflight.delete(jid);
        });
        inflight.set(jid, promise);
        return promise;
    };

    return {
        get,
        remember,
        invalidate: (jid) => {
            cache.del(jid);
        },
        peek: (jid) => cache.get(jid),
        close: () => {
            cache.close();
            lastKnown.clear();
            inflight.clear();
        }
    };
};
