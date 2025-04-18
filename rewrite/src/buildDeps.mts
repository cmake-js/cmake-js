import path from 'node:path'
import urljoin from 'url-join'
import * as fs from 'fs-extra'
import RuntimePaths, { RuntimePathsInfo, TargetOptions } from './runtimePaths.mjs'
import Downloader from './downloader.mjs'

interface ShaSum {
	getPath: string
	sum: string
}

interface Stat {
	isFile: () => boolean
	isDirectory: () => boolean
}

export default class BuildDepsDownloader {
	private readonly storageDir: string
	private readonly targetOptions: TargetOptions
	private readonly downloader: Downloader
	private readonly runtimePaths: RuntimePathsInfo

	get internalPath(): string {
		const runtimeArchDirectory = this.targetOptions.runtime + '-' + this.targetOptions.runtimeArch
		const runtimeVersionDirectory = 'v' + this.targetOptions.runtimeVersion

		return path.join(this.storageDir, runtimeArchDirectory, runtimeVersionDirectory)
	}

	private isDownloaded(): boolean {
		let headers = false
		let libs = true
		let stat = getStat(this.internalPath)
		if (stat.isDirectory()) {
			if (this.headerOnly) {
				stat = getStat(path.join(this.internalPath, 'include/node/node.h'))
				headers = stat.isFile()
			} else {
				stat = getStat(path.join(this.internalPath, 'src/node.h'))
				if (stat.isFile()) {
					stat = getStat(path.join(this.internalPath, 'deps/v8/include/v8.h'))
					headers = stat.isFile()
				}
			}
			if (process.platform === 'win32') {
				for (const libPath of this.winLibs) {
					stat = getStat(libPath)
					libs = libs && stat.isFile()
				}
			}
		}
		return headers && libs

		function getStat(path: string): Stat {
			try {
				return fs.statSync(path)
			} catch (e) {
				return {
					isFile: () => false,
					isDirectory: () => false,
				}
			}
		}
	}

	get winLibs(): string[] {
		const libs = this.runtimePaths.winLibs
		const result: string[] = []
		for (const lib of libs) {
			result.push(path.join(this.internalPath, lib.dir, lib.name))
		}
		return result
	}

	get headerOnly(): boolean {
		return this.runtimePaths.headerOnly
	}

	constructor(storageDir: string, targetOptions: TargetOptions) {
		this.storageDir = storageDir
		this.targetOptions = targetOptions
		this.downloader = new Downloader()

		this.runtimePaths = RuntimePaths[this.targetOptions.runtime]?.(this.targetOptions)
		if (!this.runtimePaths) throw new Error('Unknown runtime: ' + this.targetOptions.runtime)
	}

	async ensureDownloaded(): Promise<void> {
		if (!this.isDownloaded()) {
			await this.download()
		}
	}

	async download(): Promise<void> {
		console.log('DIST', 'Downloading distribution files to: ' + this.internalPath)
		await fs.ensureDir(this.internalPath)
		const sums = await this._downloadShaSums()
		await Promise.all([this._downloadLibs(sums), this._downloadTar(sums)])
	}

	private async _downloadShaSums(): Promise<ShaSum[] | null> {
		if (this.targetOptions.runtime === 'node') {
			const sumUrl = urljoin(this.runtimePaths.externalPath, 'SHASUMS256.txt')
			console.debug('DIST', '\t- ' + sumUrl)
			return (await this.downloader.downloadString(sumUrl))
				.split('\n')
				.map((line: string) => {
					const parts = line.split(/\s+/)
					return {
						getPath: parts[1],
						sum: parts[0],
					}
				})
				.filter((i: ShaSum) => i.getPath && i.sum)
		} else {
			return null
		}
	}

	private async _downloadTar(sums: ShaSum[] | null): Promise<void> {
		const tarLocalPath = this.runtimePaths.tarPath
		const tarUrl = urljoin(this.runtimePaths.externalPath, tarLocalPath)
		console.debug('DIST', '\t- ' + tarUrl)

		await this.downloader.downloadTgz(
			{
				url: tarUrl,
				hash: sums ? 'sha256' : null,
				sum: sums?.find((s) => s.getPath === tarLocalPath)?.sum ?? null,
			},
			120_000_000, // Arbitrary cap of 120MB
			{
				cwd: this.internalPath,
				strip: 1,
				filter: (entryPath: string) => {
					if (entryPath === this.internalPath) {
						return true
					}
					const ext = path.extname(entryPath)
					return !!ext && ext.toLowerCase() === '.h'
				},
			},
		)
	}

	private async _downloadLibs(sums: ShaSum[] | null): Promise<void> {
		if (process.platform !== 'win32') {
			return
		}

		for (const dirs of this.runtimePaths.winLibs) {
			const subDir = dirs.dir
			const fn = dirs.name
			const fPath = subDir ? urljoin(subDir, fn) : fn
			const libUrl = urljoin(this.runtimePaths.externalPath, fPath)
			console.debug('DIST', '\t- ' + libUrl)

			await fs.ensureDir(path.join(this.internalPath, subDir))

			await this.downloader.downloadFile(
				{
					url: libUrl,
					hash: sums ? 'sha256' : null,
					sum: sums?.find((s) => s.getPath === fPath)?.sum ?? null,
				},
				25_000_000, // Arbitrary cap of 25MB
				path.join(this.internalPath, fPath),
			)
		}
	}
}
