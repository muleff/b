import assert from 'node:assert/strict'
import test from 'node:test'
import { deflateSync } from 'node:zlib'
import pino from 'pino'
import { makeNoiseHandler } from '../lib/Utils/noise-handler.js'
import { encodeBinaryNode } from '../lib/WABinary/encode.js'
import { aesEncryptGCM, hkdf, sha256 } from '../lib/Utils/crypto.js'
import { NOISE_MODE } from '../lib/Defaults/index.js'

const logger = pino({ level: 'silent' })
const create = () => makeNoiseHandler({ keyPair: { private: Buffer.alloc(32), public: Buffer.alloc(32) }, NOISE_HEADER: Buffer.from([87, 65, 6, 3]), logger })
const wrap = bytes => {
	const result = Buffer.alloc(bytes.length + 3)
	result.writeUIntBE(bytes.length, 0, 3)
	result.set(bytes, 3)
	return result
}

test('handshake frames survive every split position including zero-length payloads', async () => {
	const payloads = [Buffer.from('first'), Buffer.alloc(0), Buffer.from('second')]
	const wire = Buffer.concat(payloads.map(wrap))
	for (let split = 0; split <= wire.length; split++) {
		const handler = create()
		const output = []
		await handler.decodeFrame(wire.subarray(0, split), frame => output.push(Buffer.from(frame)))
		await handler.decodeFrame(wire.subarray(split), frame => output.push(Buffer.from(frame)))
		assert.deepEqual(output, payloads)
	}
})

test('fragmented typed-array views preserve their actual byte offsets', async () => {
	const handler = create()
	const wire = wrap(Buffer.alloc(8192, 71))
	const output = []
	for (let start = 0; start < wire.length; start += 17) {
		const data = new Uint8Array(wire.buffer, wire.byteOffset + start, Math.min(17, wire.length - start))
		await handler.decodeFrame(data, frame => output.push(Buffer.from(frame)))
	}
	assert.deepEqual(output, [Buffer.alloc(8192, 71)])
})

test('concurrent compressed and plain transport frames arrive in wire order', async () => {
	const handler = create()
	await handler.finishInit()
	const data = Buffer.from(NOISE_MODE)
	const salt = data.length === 32 ? data : sha256(data)
	const readKey = hkdf(Buffer.alloc(0), 64, { salt, info: '' }).subarray(32)
	const first = encodeBinaryNode({ tag: 'message', attrs: { id: 'first' }, content: Buffer.alloc(512 * 1024, 1) })
	const second = encodeBinaryNode({ tag: 'message', attrs: { id: 'second' } })
	const plaintexts = [Buffer.concat([Buffer.from([2]), deflateSync(first.subarray(1))]), second]
	const wires = plaintexts.map((plain, counter) => {
		const iv = Buffer.alloc(12)
		iv.writeUInt32BE(counter, 8)
		return wrap(aesEncryptGCM(plain, readKey, iv, Buffer.alloc(0)))
	})
	const ids = []
	await Promise.all(wires.map(wire => handler.decodeFrame(wire, node => ids.push(node.attrs.id))))
	assert.deepEqual(ids, ['first', 'second'])
})

test('callback failures reject without leaving later handshake frames stuck', async () => {
	const handler = create()
	await assert.rejects(handler.decodeFrame(wrap(Buffer.from('bad')), () => { throw new Error('consumer failed') }), /consumer failed/)
	const output = []
	await handler.decodeFrame(wrap(Buffer.from('next')), frame => output.push(frame.toString()))
	assert.deepEqual(output, ['next'])
})

test('oversized outgoing frames fail before consuming a transport nonce', async () => {
	const handler = create()
	const control = create()
	await Promise.all([handler.finishInit(), control.finishInit()])
	assert.throws(() => handler.encodeFrame(Buffer.alloc(0x1000000)), /frame.*large/i)
	assert.deepEqual(handler.encodeFrame(Buffer.from('valid')), control.encodeFrame(Buffer.from('valid')))
})

test('a callback failure preserves later frames already received in the same chunk', async () => {
	const handler = create()
	const output = []
	await assert.rejects(handler.decodeFrame(Buffer.concat([wrap(Buffer.from('bad')), wrap(Buffer.from('retained'))]), () => { throw new Error('consumer failed') }), /consumer failed/)
	await handler.decodeFrame(Buffer.alloc(0), frame => output.push(frame.toString()))
	assert.deepEqual(output, ['retained'])
})

test('decodeFrame owns delivered bytes while its input buffer is changed by the caller', async () => {
	const handler = create()
	const wire = wrap(Buffer.from('original'))
	const output = []
	const delivery = handler.decodeFrame(wire, frame => output.push(frame.toString()))
	wire.fill(0)
	await delivery
	assert.deepEqual(output, ['original'])
})
