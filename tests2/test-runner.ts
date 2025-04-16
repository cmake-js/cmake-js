import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from '../rewrite/src/processHelpers'
import { rimraf } from 'rimraf'
import fs from 'node:fs/promises'

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

	async testInvokeCmakeDirect() {
		await rimraf(path.join(this.projectDir, 'build'))

		// make build dir
		const buildDir = path.join(this.projectDir, 'build')
		await fs.mkdir(buildDir)

		// Prepare build
		await runCommand(['cmake', '..'], {
			cwd: buildDir,
		})

		// Perform build
		await runCommand(['cmake', '--build', '.'], {
			cwd: buildDir,
		})

		// Make sure addon is loadable
		await runCommand(['node', path.join(buildDir, 'lib/addon.node')], {
			cwd: buildDir,
		})
	}
}
