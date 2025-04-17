import * as environment from './environment'
import * as path from 'path'
import * as urljoin from 'url-join'
import * as fs from 'fs-extra'
import TargetOptions from './targetOptions'
import * as runtimePaths from './runtimePaths'
import Downloader from './downloader'
import * as os from 'os'

interface ShaSum {
	getPath: string
	sum: string
}

interface Stat {
	isFile: () => boolean
	isDirectory: () => boolean
}

interface LibPath {
	dir: string
	name: string
}

interface DistOptions {
	runtimeDirectory: string
}

function testSum(sums: ShaSum[], sum: string | undefined, fPath: string): void {
	const serverSum = sums.find((s) => s.getPath === fPath)
	if (serverSum && serverSum.sum === sum) {
		return
	}
	throw new Error("SHA sum of file '" + fPath + "' mismatch!")
}

class Dist {
	private options: DistOptions
	private targetOptions: TargetOptions
	private downloader: Downloader

	get internalPath(): string {
		const cacheDirectory = '.cmake-js'
		const runtimeArchDirectory = this.targetOptions.runtime + '-' + this.targetOptions.arch
		const runtimeVersionDirectory = 'v' + this.targetOptions.runtimeVersion

		return (
			this.options.runtimeDirectory ||
			path.join(os.homedir(), cacheDirectory, runtimeArchDirectory, runtimeVersionDirectory)
		)
	}

	get externalPath(): string {
		return runtimePaths.get(this.targetOptions).externalPath
	}

	get downloaded(): boolean {
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
			if (environment.isWin) {
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
		const libs = runtimePaths.get(this.targetOptions).winLibs
		const result: string[] = []
		for (const lib of libs) {
			result.push(path.join(this.internalPath, lib.dir, lib.name))
		}
		return result
	}

	get headerOnly(): boolean {
		return runtimePaths.get(this.targetOptions).headerOnly
	}

	constructor(options: DistOptions) {
		this.options = options
		this.targetOptions = new TargetOptions(this.options)
		this.downloader = new Downloader()
	}

	async ensureDownloaded(): Promise<void> {
		if (!this.downloaded) {
			await this.download()
		}
	}

	async download(): Promise<void> {
		console.log('DIST', 'Downloading distribution files to: ' + this.internalPath)
		await fs.ensureDir(this.internalPath)
		const sums = await this._downloadShaSums()
		await Promise.all([this._downloadLibs(sums), this._downloadTar(sums)])
	}

	async _downloadShaSums(): Promise<ShaSum[] | null> {
		if (this.targetOptions.runtime === 'node') {
			const sumUrl = urljoin(this.externalPath, 'SHASUMS256.txt')
			console.debug('DIST', '\t- ' + sumUrl)
			return (await this.downloader.downloadString(sumUrl))
				.split('\n')
				.map(function (line: string) {
					const parts = line.split(/\s+/)
					return {
						getPath: parts[1],
						sum: parts[0],
					}
				})
				.filter(function (i: ShaSum) {
					return i.getPath && i.sum
				})
		} else {
			return null
		}
	}

	async _downloadTar(sums: ShaSum[] | null): Promise<void> {
		const self = this
		const tarLocalPath = runtimePaths.get(self.targetOptions).tarPath
		const tarUrl = urljoin(self.externalPath, tarLocalPath)
		console.debug('DIST', '\t- ' + tarUrl)

		const sum = await this.downloader.downloadTgz(tarUrl, {
			hash: sums ? 'sha256' : null,
			cwd: self.internalPath,
			strip: 1,
			filter: function (entryPath: string) {
				if (entryPath === self.internalPath) {
					return true
				}
				const ext = path.extname(entryPath)
				return ext && ext.toLowerCase() === '.h'
			},
		})

		if (sums) {
			testSum(sums, sum, tarLocalPath)
		}
	}

	async _downloadLibs(sums: ShaSum[] | null): Promise<void> {
		const self = this
		if (!environment.isWin) {
			return
		}

		const paths = runtimePaths.get(self.targetOptions)
		for (const dirs of paths.winLibs) {
			const subDir = dirs.dir
			const fn = dirs.name
			const fPath = subDir ? urljoin(subDir, fn) : fn
			const libUrl = urljoin(self.externalPath, fPath)
			console.debug('DIST', '\t- ' + libUrl)

			await fs.ensureDir(path.join(self.internalPath, subDir))

			const sum = await this.downloader.downloadFile(libUrl, {
				path: path.join(self.internalPath, fPath),
				hash: sums ? 'sha256' : null,
			})

			if (sums) {
				testSum(sums, sum, fPath)
			}
		}
	}
}

export default Dist
