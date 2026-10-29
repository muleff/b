export class FrameDecoder {
	constructor() {
		this.header = Buffer.allocUnsafe(3)
		this.headerLength = 0
		this.payload = null
		this.payloadLength = 0
	}
	push(data) {
		const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength)
		const frames = []
		let offset = 0
		while (offset < bytes.length) {
			if (this.payload) {
				const length = Math.min(bytes.length - offset, this.payload.length - this.payloadLength)
				bytes.copy(this.payload, this.payloadLength, offset, offset + length)
				this.payloadLength += length
				offset += length
				if (this.payloadLength === this.payload.length) {
					frames.push(this.payload)
					this.payload = null
					this.payloadLength = 0
				}
				continue
			}
			while (this.headerLength < 3 && offset < bytes.length) {
				this.header[this.headerLength++] = bytes[offset++]
			}
			if (this.headerLength < 3) {
				break
			}
			const length = this.header.readUIntBE(0, 3)
			this.headerLength = 0
			if (bytes.length - offset >= length) {
				frames.push(bytes.subarray(offset, offset + length))
				offset += length
			} else {
				this.payload = Buffer.allocUnsafe(length)
				this.payloadLength = bytes.length - offset
				bytes.copy(this.payload, 0, offset)
				offset = bytes.length
			}
		}
		return frames
	}
}
