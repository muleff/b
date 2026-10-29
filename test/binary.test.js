import assert from 'node:assert/strict'
import test from 'node:test'
import { encodeBinaryNode } from '../lib/WABinary/encode.js'
import { decodeBinaryNode } from '../lib/WABinary/decode.js'
import { encodeBinaryNode as baseline } from './fixtures/encode-baseline.js'

const sample = { tag: 'message', attrs: { id: '123', to: '12345@s.whatsapp.net' }, content: Buffer.from([1, 2, 3]) }

test('message wire bytes match a fixed protocol fixture', () => {
	assert.equal(encodeBinaryNode(sample).toString('hex'), '00f8061308ff82123f11faff8312345f03fc03010203')
})

test('caller prefix arrays retain their append behavior', () => {
	const prefix = [0, 17]
	const expected = [0, 17]
	assert.deepEqual(encodeBinaryNode(sample, undefined, prefix), baseline(sample, undefined, expected))
	assert.deepEqual(prefix, expected)
})

test('deterministic trees retain baseline encoding across binary lengths and JID domains', async () => {
	let seed = 19371
	const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0)
	for (const length of [0, 1, 255, 256, 1024, 65536, 1048575, 1048576]) {
		const backing = Buffer.alloc(length + 16, 0xa5)
		const bytes = new Uint8Array(backing.buffer, backing.byteOffset + 7, length)
		const node = { tag: 'message', attrs: { id: String(next()), to: '123:4@lid', unused: undefined }, content: bytes }
		assert.deepEqual(encodeBinaryNode(node), baseline(node))
		const decoded = await decodeBinaryNode(encodeBinaryNode(node))
		assert.equal(decoded.attrs.to, '123:4@lid')
		assert.deepEqual(decoded.content, Buffer.from(bytes))
	}
	for (let i = 0; i < 150; i++) {
		const node = { tag: 'iq', attrs: { id: `a-${next()}`, type: 'get', to: ['s.whatsapp.net', '12345@s.whatsapp.net', '987:2@hosted.lid'][i % 3] }, content: Array.from({ length: next() % 12 }, (_, j) => ({ tag: 'item', attrs: { value: `${j}-é-🌞-${next()}` }, content: Buffer.alloc(next() % 400, j) })) }
		assert.deepEqual(encodeBinaryNode(node), baseline(node))
	}
})

test('results own their bytes across later writes and input mutations', () => {
	const first = encodeBinaryNode(sample)
	const expected = Buffer.from(first)
	const node = { ...sample, content: Buffer.alloc(65536, 27) }
	encodeBinaryNode(node)
	node.content.fill(0)
	assert.deepEqual(first, expected)
})

test('oversized child lists fail instead of truncating the 16-bit wire count', () => {
	assert.throws(() => encodeBinaryNode({ tag: 'iq', attrs: {}, content: Array.from({ length: 65536 }, () => ({ tag: 'item', attrs: {} })) }), /list.*large|list.*size/i)
})
