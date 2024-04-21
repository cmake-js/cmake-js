import fs from 'fs/promises'
import path from 'path'
import { runCommand } from './processHelpers'
import { findCmake, getGenerators } from './toolchain'

export interface BuildSystemOptions {
	sourceDir: string
	buildDir: string
}

export class BuildSystem {
	readonly #options: BuildSystemOptions
	#cmakePath: string | null = null

	constructor(options: BuildSystemOptions) {
		this.#options = options
	}

	async findCmake(): Promise<string> {
		if (!this.#cmakePath) {
			this.#cmakePath = await findCmake()
		}

		return this.#cmakePath
	}

	async invokeCmake(args: string[]): Promise<void> {
		const cmakePath = await this.findCmake()

		await runCommand([cmakePath, ...args])
	}

	async configure(args: string[]): Promise<void> {
		const cmakePath = await this.findCmake()

		// Make sure the project looks valid
		const listPath = path.join(this.#options.sourceDir, 'CMakeLists.txt')
		try {
			await fs.lstat(listPath)
		} catch (e) {
			throw new Error(`'${listPath}' not found.`)
		}

		// Ensure the build dir exists
		try {
			await fs.mkdir(this.#options.buildDir, { recursive: true })
		} catch (e) {
			// Ignore
		}

		await runCommand([cmakePath, this.#options.sourceDir, ...args], {
			cwd: this.#options.buildDir,
		})
	}

	async isConfigured(): Promise<boolean> {
		try {
			await fs.lstat(path.join(this.#options.buildDir, 'CMakeCache.txt'))
			return true
		} catch (e) {
			return false
		}
	}

	async ensureConfigured(args: string[]): Promise<void> {
		if (!(await this.isConfigured())) {
			await this.configure(args)
		}
	}

	async build(buildOptions: { config: string; target?: string }): Promise<void> {
		if (!(await this.isConfigured())) {
			throw new Error('Project not configured')
		}

		const cmakePath = await this.findCmake()

		const buildCommand = [cmakePath, '--build', this.#options.buildDir, '--config', buildOptions.config]
		if (buildOptions.target) {
			buildCommand.push('--target', buildOptions.target)
		}

		// TODO --parallel should be driven from some environment variable
		// if (this.options.parallel) {
		// 	command.push('--parallel', this.options.parallel)
		// }

		console.log(buildCommand)
		await runCommand(buildCommand, {
			cwd: this.#options.buildDir,
		})
	}

	async clean(): Promise<void> {
		try {
			await fs.rm(this.#options.buildDir, { recursive: true })
		} catch (e) {
			// Ignore
		}
	}

	async getGenerators(): Promise<string[]> {
		const cmakePath = await this.findCmake()
		return getGenerators(cmakePath, null)
	}
}
