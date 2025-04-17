import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from '../rewrite/src/processHelpers'
import { rimraf } from 'rimraf'
import fs from 'node:fs/promises'
import { expect } from 'vitest'

export class CmakeTestRunner {
	readonly projectDir: string
	readonly buildDir: string

	public generator: string | null = null
	public nodeDevDirectory: string | null = null

	constructor(projectName: string) {
		this.projectDir = fileURLToPath(new URL(path.join('./projects', projectName), import.meta.url))
		this.buildDir = path.join(this.projectDir, 'build')
	}

	async prepareProject() {
		await runCommand(['yarn', 'install', '--ignore-scripts'], {
			cwd: this.projectDir,
		})
	}

	async testInvokeCmakeDirectSimple(cmakeArgs: string[] = []) {
		// make build dir
		await rimraf(this.buildDir)
		await fs.mkdir(this.buildDir)

		// Prepare build
		const cmakeCommand = ['cmake', '..', ...cmakeArgs]
		if (this.generator) cmakeCommand.push('-G', `"${this.generator}"`)
		if (this.nodeDevDirectory) cmakeCommand.push('-D', `NODE_DEV_API_DIR="${this.nodeDevDirectory}"`)

		await runCommand(cmakeCommand, {
			cwd: this.buildDir,
		})

		// Perform build
		await runCommand(['cmake', '--build', '.'], {
			cwd: this.buildDir,
		})
	}

	async testInvokeCmakeDirect(cmakeArgs: string[] = [], launchCheckShouldFail = false) {
		await this.testInvokeCmakeDirectSimple(cmakeArgs)

		// Make sure addon is loadable
		const addonPath =
			process.platform === 'win32'
				? path.join(this.buildDir, 'Debug/addon.node')
				: path.join(this.buildDir, 'lib/addon.node')

		const launched = await runCommand(['node', addonPath], {
			cwd: this.buildDir,
		}).then(
			() => true,
			() => false,
		)

		expect(launched).toBe(!launchCheckShouldFail)
	}
}

export function getGeneratorsForPlatform(): Array<string | null> {
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
