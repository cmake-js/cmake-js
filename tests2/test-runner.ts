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

	async testInvokeCmakeDirect(cmakeArgs: string[] = [], launchCheckShouldFail = false) {
		await rimraf(path.join(this.projectDir, 'build'))

		// make build dir
		const buildDir = path.join(this.projectDir, 'build')
		await fs.mkdir(buildDir)

		// Prepare build
		await runCommand(['cmake', '..', ...cmakeArgs], {
			cwd: buildDir,
		})

		// Perform build
		await runCommand(['cmake', '--build', '.'], {
			cwd: buildDir,
		})

		// Make sure addon is loadable
		const launched = await runCommand(['node', path.join(buildDir, 'lib/addon.node')], {
			cwd: buildDir,
		}).then(
			() => true,
			() => false,
		)

		expect(launched).toBe(!launchCheckShouldFail)
	}
}
