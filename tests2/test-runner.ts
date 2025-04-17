import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from '../rewrite/src/processHelpers'
import { rimraf } from 'rimraf'
import fs from 'node:fs/promises'
import { expect } from 'vitest'

export class CmakeTestRunner {
	readonly projectDir: string

	constructor(projectName: string) {
		this.projectDir = fileURLToPath(new URL(path.join('./projects', projectName), import.meta.url))
	}

	async prepareProject() {
		await runCommand(['yarn', 'install', '--ignore-scripts'], {
			cwd: this.projectDir,
		})
	}

	async testInvokeCmakeDirect(generator: string | null, cmakeArgs: string[] = [], launchCheckShouldFail = false) {
		await rimraf(path.join(this.projectDir, 'build'))

		// make build dir
		const buildDir = path.join(this.projectDir, 'build')
		await fs.mkdir(buildDir)

		// Prepare build
		const cmakeCommand = ['cmake', '..', ...cmakeArgs]
		if (generator) cmakeCommand.push('-G', `"${generator}"`)
		await runCommand(cmakeCommand, {
			cwd: buildDir,
		})

		// Perform build
		await runCommand(['cmake', '--build', '.'], {
			cwd: buildDir,
		})

		// Make sure addon is loadable
		const addonPath =
			process.platform === 'win32' ? path.join(buildDir, 'lib/Debug/addon.node') : path.join(buildDir, 'lib/addon.node')

		const launched = await runCommand(['node', addonPath], {
			cwd: buildDir,
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
		case 'linux':
			return ['Ninja', 'Unix Makefiles', null]
		case 'win32':
			return [null]
		default:
			throw new Error(`Unsupported platform: ${process.platform}`)
	}
}
