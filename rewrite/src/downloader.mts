import crypto from 'node:crypto'
import axios from 'axios'
import zlib from 'node:zlib'
import tar from 'tar'
import fs from 'node:fs/promises'
import { Readable } from 'node:stream'

interface DownloadSourceOptions {
	url: string
	hash: string | null
	sum: string | null
}

export default class Downloader {
	async downloadString(url: string): Promise<string> {
		return axios
			.get(url, {
				responseType: 'text',
				maxContentLength: 10_000, // arbitrary cap
			})
			.then((response) => response.data)
	}

	private async downloadArrayBuffer(source: DownloadSourceOptions, maxContentLength: number): Promise<ArrayBuffer> {
		const response = await axios.get(source.url, {
			responseType: 'arraybuffer',
			maxContentLength: maxContentLength,
			onDownloadProgress: (progressEvent) => {
				const percentage = progressEvent.total
					? Math.round((progressEvent.loaded * 100) / progressEvent.total)
					: 'Unknown'

				// This is not amazing granularity, it is timed based every ~500ms
				console.debug('DWNL', `\t${percentage}%`)
			},
		})
		const buffer: ArrayBuffer = await response.data

		// Check the hash if provided
		if (source.hash && source.sum) {
			const shasum = crypto.createHash(source.hash)
			shasum.update(Buffer.from(buffer))
			const sum = shasum.digest('hex')

			if (source.sum !== sum) {
				throw new Error(
					`${source.hash.toUpperCase()} sum of download '${source.url}' mismatch! Got "${sum}", expected "${source.sum}"`,
				)
			}
		}

		return buffer
	}

	async downloadFile(source: DownloadSourceOptions, maxContentLength: number, targetPath: string): Promise<void> {
		const fileBuffer = await this.downloadArrayBuffer(source, maxContentLength)

		await fs.writeFile(targetPath, Buffer.from(fileBuffer))
	}

	async downloadTgz(
		source: DownloadSourceOptions,
		maxContentLength: number,
		tarOpts: tar.ExtractOptions,
	): Promise<void> {
		const fileBuffer = await this.downloadArrayBuffer(source, maxContentLength)

		const gunzip = zlib.createGunzip()
		const extractor = tar.extract(tarOpts)
		gunzip.pipe(extractor)

		await new Promise((resolve, reject) => {
			Readable.from(Buffer.from(fileBuffer))
				.pipe(gunzip)
				// resolve once complete
				.on('finish', resolve)
				.on('error', reject)
		})
	}
}
