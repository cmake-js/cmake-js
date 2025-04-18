import crypto from 'node:crypto'
import axios from 'axios'
import zlib from 'node:zlib'
import tar from 'tar'
import { createWriteStream } from 'node:fs'
import { once } from 'node:stream'

interface DownloadSourceOptions {
	url: string
	hash: string | null
	sum: string | null
}

export default class Downloader {
	private downloadToStream(
		url: string,
		stream: NodeJS.WritableStream,
		hash: string | null,
	): Promise<string | undefined> {
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
		return axios.get(url, { responseType: 'text' }).then((response) => response.data)
	}

	async downloadFile(source: DownloadSourceOptions, targetPath: string): Promise<void> {
		const result = createWriteStream(targetPath)
		const sum = await this.downloadToStream(source.url, result, source.hash)
		this.testSum(source, sum)
	}

	async downloadTgz(source: DownloadSourceOptions, tarOpts: tar.ExtractOptions): Promise<void> {
		const gunzip = zlib.createGunzip()
		const extractor = tar.extract(tarOpts)
		gunzip.pipe(extractor)

		// TODO - should this download first, then extract?
		// maybe not even streaming the file?
		// the downside being losing the progress numbers
		// The current approach is flawed, in that it exracts the tar before checking the checksum.
		// And if the checksum is wrong, it will leave a bad data extracted, where the next run will
		// find it and assume it is good to use
		// Could a corrupt file cause it to expand to an infinite size?
		// We could set an arbitrary cap based on the actual size of the header archives,
		// surely they can't be more than like 10MB, so cap it at 50MB?
		// considering this is a step just before a compiler, 50MB of memory is nothing to use temporarily.

		const sum = await this.downloadToStream(source.url, gunzip, source.hash)

		// Ensure the extractor is closed before resolving
		// await once(extractor, 'close')

		this.testSum(source, sum)
	}

	private testSum(source: DownloadSourceOptions, sum: string | undefined): void {
		if (source.hash && source.sum && source.sum !== sum) {
			throw new Error(
				`${source.hash.toUpperCase()} sum of download '${source.url}' mismatch! Got "${sum}", expected "${source.sum}"`,
			)
		}
	}
}
