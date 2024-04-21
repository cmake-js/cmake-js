import fs from 'fs/promises'
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
