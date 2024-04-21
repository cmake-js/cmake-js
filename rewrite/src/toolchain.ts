import fs from 'fs/promises'
import os from 'os'
import which from 'which'
import { execFile } from './processHelpers'

export async function findCmake(): Promise<string> {
	const overridePath = process.env['CMAKEJS_CMAKE_PATH']
	if (overridePath) {
		try {
			const stat = await fs.lstat(overridePath)
			if (!stat.isDirectory()) {
				return overridePath
			}
		} catch (e) {
			// Ignore
		}
		throw new Error(`Invalid cmake path: ${overridePath}`)
	} else {
		const res = which('cmake', { first: true })
		if (!res) {
			throw new Error(`cmake not found in PATH`)
		}
		return res
	}
}

export function isMakeAvailable(): boolean {
	const res = which('make', { first: true })
	return !!res
}
export function isNinjaAvailable(): boolean {
	const res = which('ninja', { first: true })
	return !!res
}

export async function getGenerators(cmakePath: string, log: any): Promise<string[]> {
	const generators: string[] = []

	// parsing machine-readable capabilities (available since CMake 3.7)
	try {
		const stdout = await execFile([cmakePath, '-E', 'capabilities'])
		const capabilities = JSON.parse(stdout)
		return capabilities.generators.map((x: any) => x.name)
	} catch (error) {
		if (log) {
			log.verbose('TOOL', 'Failed to query CMake capabilities (CMake is probably older than 3.7)')
		}
	}

	return generators
}

export async function getTopSupportedVisualStudioGenerator(cmakePath: string, targetArch: string, log: any) {
	if (os.platform() !== 'win32') throw new Error('Visual Studio Generator is only supported on Windows')

	const { findVisualStudio } =
		require('../../lib/import/find-visualstudio') as typeof import('../../lib/import/find-visualstudio')

	let selectedVs = null
	try {
		selectedVs = await findVisualStudio(
			'18.0.0', // TODO: does this matter, given this only supported node-api?
			undefined, // TODO: respect: npm config msvs_version,
		)
	} catch (e) {
		// TODO - log?
	}
	if (!selectedVs) return null

	const list = await getGenerators(cmakePath, log)
	for (const gen of list) {
		// Match it with a cmake generator, to confirm that it is valid/supported
		const found = gen.startsWith(`Visual Studio ${selectedVs.versionMajor}`)
		if (!found) {
			continue
		}

		// unlike previous versions "Visual Studio 16 2019" and onwards don't end with arch name
		const isAboveVS16 = selectedVs.versionMajor >= 16
		if (!isAboveVS16) {
			const is64Bit = gen.endsWith('Win64')
			if ((targetArch === 'x86' && is64Bit) || (targetArch === 'x64' && !is64Bit)) {
				continue
			}
		}

		return {
			...selectedVs,
			generator: gen,
		}
	}

	// Nothing matched
	return null
}
