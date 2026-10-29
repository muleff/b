import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate as turn } from 'node:timers/promises'
import { makeOfflineNodeProcessor } from '../lib/Utils/offline-node-processor.js'

const settle = async () => { await turn(); await turn() }

test('offline nodes keep FIFO order across batches and yield to the event loop', async () => {
	const output = []
	let yields = 0
	const queue = makeOfflineNodeProcessor(new Map([['message', async node => { output.push(node) }]]), { isWsOpen: () => true, onUnexpectedError: err => { throw err }, yieldToEventLoop: async () => { yields++; await turn() } }, 3)
	for (let i = 0; i < 20; i++) queue.enqueue('message', i)
	for (let i = 0; i < 10; i++) await turn()
	assert.deepEqual(output, Array.from({ length: 20 }, (_, i) => i))
	assert.equal(yields, 6)
})

test('a synchronously throwing handler cannot stall later offline messages', async () => {
	const output = []
	const errors = []
	const queue = makeOfflineNodeProcessor(new Map([['message', node => {
		if (node === 0) throw new Error('sync failure')
		output.push(node)
		return Promise.resolve()
	}]]), { isWsOpen: () => true, onUnexpectedError: err => errors.push(err.message), yieldToEventLoop: turn })
	queue.enqueue('message', 0)
	queue.enqueue('message', 1)
	await settle()
	queue.enqueue('message', 2)
	await settle()
	assert.deepEqual(output, [1, 2])
	assert.deepEqual(errors, ['sync failure'])
})

test('unknown types and rejected handlers do not discard subsequent work', async () => {
	const output = []
	const errors = []
	const queue = makeOfflineNodeProcessor(new Map([['message', async node => {
		if (node === 1) throw new Error('async failure')
		output.push(node)
	}]]), { isWsOpen: () => true, onUnexpectedError: err => errors.push(err.message), yieldToEventLoop: turn })
	queue.enqueue('other', 0)
	queue.enqueue('message', 1)
	queue.enqueue('message', 2)
	await settle()
	assert.deepEqual(output, [2])
	assert.deepEqual(errors, ['unknown offline node type: other', 'async failure'])
})

test('a closed connection pauses work and the next enqueue resumes in order', async () => {
	let open = false
	const output = []
	const queue = makeOfflineNodeProcessor(new Map([['message', async node => output.push(node)]]), { isWsOpen: () => open, onUnexpectedError: err => { throw err }, yieldToEventLoop: turn })
	queue.enqueue('message', 1)
	queue.enqueue('message', 2)
	await settle()
	assert.deepEqual(output, [])
	open = true
	queue.enqueue('message', 3)
	await settle()
	assert.deepEqual(output, [1, 2, 3])
})
