export function makeOfflineNodeProcessor(nodeProcessorMap, deps, batchSize = 10) {
	let nodes = []
	let head = 0
	let isProcessing = false
	const enqueue = (type, node) => {
		nodes.push({ type, node })
		if (isProcessing) {
			return
		}
		isProcessing = true
		const process = async () => {
			let processedInBatch = 0
			try {
				while (head < nodes.length && deps.isWsOpen()) {
					const { type, node } = nodes[head]
					nodes[head++] = undefined
					if (head >= 1024 && head * 2 >= nodes.length) {
						nodes = nodes.slice(head)
						head = 0
					}
					const nodeProcessor = nodeProcessorMap.get(type)
					if (!nodeProcessor) {
						deps.onUnexpectedError(new Error(`unknown offline node type: ${type}`), 'processing offline node')
					} else {
						try {
							await nodeProcessor(node)
						} catch (err) {
							deps.onUnexpectedError(err, `processing offline ${type}`)
						}
					}
					if (++processedInBatch >= batchSize) {
						processedInBatch = 0
						await deps.yieldToEventLoop()
					}
				}
			} finally {
				if (head === nodes.length) {
					nodes.length = 0
					head = 0
				}
				isProcessing = false
			}
		}
		process().catch(error => deps.onUnexpectedError(error, 'processing offline nodes'))
	}
	return { enqueue }
}
