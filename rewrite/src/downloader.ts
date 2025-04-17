import crypto from 'node:crypto'
import axios from 'axios'
import MemoryStream from 'memory-stream'
import zlib from 'node:zlib'
import tar from 'tar'
import { createWriteStream } from 'node:fs'

interface DownloadOptions {
	path?: string
	cwd?: string
	hash?: string
	sum?: string
}

class Downloader {
	private downloadToStream(url: string, stream: NodeJS.WritableStream, hash?: string): Promise<string | undefined> {
		const shasum = hash ? crypto.createHash(hash) : null

		return new Promise<string | undefined>((resolve, reject) => {
			let length = 0
			let done = 0
			let lastPercent = 0

			axios
				.get(url, { responseType: 'stream' })
				.then((response) => {
					length = parseInt(response.headers['content-length'] as string)
					if (typeof length !== 'number') {
						length = 0
					}

					response.data.on('data', (chunk: Buffer) => {
						if (shasum) {
							shasum.update(chunk)
						}
						if (length) {
							done += chunk.length
							let percent = (done / length) * 100
							percent = Math.round(percent / 10) * 10 + 10
							if (percent > lastPercent) {
								console.debug('DWNL', '\t' + lastPercent + '%')
								lastPercent = percent
							}
						}
					})

					response.data.pipe(stream)
				})
				.catch((err) => {
					reject(err)
				})

			stream.once('error', (err) => {
				reject(err)
			})

			stream.once('finish', () => {
				resolve(shasum ? shasum.digest('hex') : undefined)
			})
		})
	}

	async downloadString(url: string): Promise<string> {
		const result = new MemoryStream()
		await this.downloadToStream(url, result)
		return result.toString()
	}

	async downloadFile(url: string, options: DownloadOptions): Promise<string | undefined> {
		let opts: DownloadOptions
		if (typeof options === 'string') {
			opts = { path: options }
		} else {
			opts = options
		}

		const result = createWriteStream(opts.path)
		const sum = await this.downloadToStream(url, result, opts.hash)
		this.testSum(url, sum, opts)
		return sum
	}

	async downloadTgz(url: string, options: DownloadOptions | string): Promise<string | undefined> {
		let opts: DownloadOptions
		if (typeof options === 'string') {
			opts = { cwd: options }
		} else {
			opts = options
		}

		const gunzip = zlib.createGunzip()
		const extractor = tar.extract(opts)
		gunzip.pipe(extractor)
		const sum = await this.downloadToStream(url, gunzip, opts.hash)
		this.testSum(url, sum, opts)
		return sum
	}

	private testSum(url: string, sum: string | undefined, options: DownloadOptions): void {
		if (options.hash && sum && options.sum && options.sum !== sum) {
			throw new Error(options.hash.toUpperCase() + " sum of download '" + url + "' mismatch!")
		}
	}
}

export default Downloader
