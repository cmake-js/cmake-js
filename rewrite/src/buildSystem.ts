import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { runCommand } from './processHelpers'
import {
	findCmake,
	getGenerators,
	getTopSupportedVisualStudioGenerator,
	isMakeAvailable,
	isNinjaAvailable,
} from './toolchain'

export interface BuildSystemOptions {
	sourceDir: string
	buildDir: string
	config: string
	generator: string | undefined

	preferMake: boolean
	preferXcode: boolean
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

		const forcedArgs: string[] = []

		const generator = this.#options.generator || (await this.selectGeneratorAndPlatform())?.generator
		if (generator) {
			forcedArgs.push('-G', generator)
		}

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

		await runCommand([cmakePath, this.#options.sourceDir, ...forcedArgs, ...args], {
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

	async build(buildOptions: { target?: string }): Promise<void> {
		if (!(await this.isConfigured())) {
			throw new Error('Project not configured')
		}

		const cmakePath = await this.findCmake()

		const buildCommand = [cmakePath, '--build', this.#options.buildDir, '--config', this.#options.config]
		if (buildOptions.target) {
			buildCommand.push('--target', buildOptions.target)
		}

		// TODO --parallel should be driven from some environment variable
		// if (this.#options.parallel) {
		// 	command.push('--parallel', this.#options.parallel)
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

	async selectGeneratorAndPlatform(): Promise<{ generator: string; platform: string | null } | null> {
		if (os.platform() === 'win32') {
			const targetArch: string = 'x64' // TODO

			const cmakePath = await this.findCmake() // TODO - this should not be done here...
			const foundVsInfo = await getTopSupportedVisualStudioGenerator(cmakePath, targetArch as any, null)

			if (foundVsInfo) {
				let platform: string | null = null
				// The CMake Visual Studio Generator does not support the Win64 or ARM suffix on
				// the generator name. Instead the generator platform must be set explicitly via
				// the platform parameter
				const isAboveVS16 = foundVsInfo.versionMajor >= 16
				if (isAboveVS16) {
					switch (targetArch) {
						case 'ia32':
						case 'x86':
							platform = 'Win32'
							break
						case 'x64':
							platform = 'x64'
							break
						case 'arm':
							platform = 'ARM'
							break
						case 'arm64':
							platform = 'ARM64'
							break
						default:
							// TODO - log?
							// this.log.warn('TOOL', 'Unknown NodeJS architecture: ' + this.targetOptions.arch)
							break
					}
				}

				return { generator: foundVsInfo.generator, platform }
			} else {
				// TODO: mysys/mingw
				return null
			}
		} else if (os.platform() === 'darwin') {
			if (this.#options.preferXcode) {
				return { generator: 'Xcode', platform: null }
			} else if (this.#options.preferMake && isMakeAvailable()) {
				return { generator: 'Unix Makefiles', platform: null }
			} else if (isNinjaAvailable()) {
				return { generator: 'Ninja', platform: null }
			} else {
				return { generator: 'Unix Makefiles', platform: null }
			}
		} else {
			if (this.#options.preferMake && isMakeAvailable()) {
				return { generator: 'Unix Makefiles', platform: null }
			} else if (isNinjaAvailable()) {
				return { generator: 'Ninja', platform: null }
			} else {
				return { generator: 'Unix Makefiles', platform: null }
			}
		}
	}
}
