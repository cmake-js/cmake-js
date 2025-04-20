import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile, runCommand } from '../src/processHelpers.mts'
import { rimraf } from 'rimraf'
import fs from 'node:fs/promises'
import { expect } from 'vitest'

export const NODE_DEV_CACHE_DIR = fileURLToPath(new URL('../.cache', import.meta.url))

export class CmakeTestRunner {
	readonly projectDir: string
	readonly buildDir: string

	public generator: string | null = null
	public cmakePath: string | null = null
	public nodeDevDirectory: string | null = null

	private get cmakePathSafe(): string {
		return this.cmakePath || 'cmake'
	}

	constructor(projectName: string) {
		this.projectDir = fileURLToPath(new URL(path.join('./projects', projectName), import.meta.url))
		this.buildDir = path.join(this.projectDir, 'build')
	}

	async prepareProject() {
		await runCommand(['yarn', 'install', '--ignore-scripts'], {
			cwd: this.projectDir,
		})
	}

	async getCmakeVersion() {
		// Perform build
		return execFile([this.cmakePathSafe, '--version'])
	}

	async testInvokeCmakeDirectCustom(options: {
		cmakeArgs: string[]
		expectedLaunchResult: boolean | null
		sourceDir?: string
		//
	}) {
		// make build dir
		await rimraf(this.buildDir)
		await fs.mkdir(this.buildDir)

		// Prepare build
		const configureCommand = [this.cmakePathSafe, options.sourceDir || '..', ...options.cmakeArgs]
		if (this.generator) configureCommand.push('-G', `"${this.generator}"`)
		if (this.nodeDevDirectory) configureCommand.push('-D', `NODE_DEV_API_DIR="${this.nodeDevDirectory}"`)

		await runCommand(configureCommand, {
			cwd: this.buildDir,
			env: {
				CMAKEJS_CACHE_DIR: NODE_DEV_CACHE_DIR,
			},
		})

		// Perform build
		const buildCommand = [this.cmakePathSafe, '--build', '.']
		if (process.platform === 'win32') buildCommand.push('--config', 'Release')

		await runCommand(buildCommand, {
			cwd: this.buildDir,
		})

		if (options.expectedLaunchResult !== null) {
			// Make sure addon is loadable
			const addonPath =
				process.platform === 'win32'
					? path.join(this.buildDir, 'Release/addon.node')
					: path.join(this.buildDir, 'addon.node')

			const launched = await runCommand(['node', addonPath], {
				cwd: this.buildDir,
				silent: !options.expectedLaunchResult, // Silence output as it's errors are 'normal'
			}).then(
				() => true,
				() => false,
			)

			expect(launched).toBe(options.expectedLaunchResult)
		}
	}

	async testInvokeCmakeDirectSimple(cmakeArgs: string[] = []) {
		await this.testInvokeCmakeDirectCustom({
			cmakeArgs,
			expectedLaunchResult: null,
		})
	}

	async testInvokeCmakeDirect(cmakeArgs: string[] = [], launchCheckShouldFail = false) {
		await this.testInvokeCmakeDirectCustom({
			cmakeArgs,
			expectedLaunchResult: !launchCheckShouldFail,
		})
	}
}

export function getGeneratorsForPlatform(): Array {
	switch (process.platform) {
		case 'darwin':
		// TODO: This would be good, but Xcode requires an explicit compiler path to be defined
		// return ['Xcode', 'Ninja', 'Unix Makefiles', null]
		case 'linux':
			return ['Ninja', 'Unix Makefiles', null]
		case 'win32':
			return [null]
		default:
			throw new Error(`Unsupported platform: ${process.platform}`)
	}
}

export function appendSystemCmakeArgs(args: string[], arch: string): void {
	if (process.platform === 'win32') {
		switch (arch) {
			case 'x86':
			case 'ia32':
				args.push('-A', 'Win32')
				break
			case 'x64':
				args.push('-A', 'x64')
				break
			case 'arm64':
				args.push('-A', 'ARM64')
				break
			default:
				throw new Error(`Unhandled arch: ${arch}`)
		}
	}
}
