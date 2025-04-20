import fs from 'node:fs/promises'
import path from 'node:path'
import which from 'which'
import type { FindVisualStudioResult } from '../../lib/import/find-visualstudio.js'

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
		throw new Error(`Invalid cmake path from CMAKEJS_CMAKE_PATH: ${overridePath}`)
	} else {
		try {
			const res = await which('cmake', { all: false, nothrow: true })
			if (res) return res
		} catch (e) {
			// Ignore
		}

		if (process.platform === 'win32') {
			const res = await getTopSupportedVisualStudioGenerator()
			if (res) return res
		}

		throw new Error(`cmake not found in PATH. Please install cmake or set CMAKEJS_CMAKE_PATH to the cmake executable.`)
	}
}

/**
 * This uses the find-visualstudio logic copied from node-gyp to find the top supported Visual Studio generator.
 * We aren't currently using that generator, but it ships cmake so we can use that to avoid requiring the user
 * to install cmake separately.
 */
async function getTopSupportedVisualStudioGenerator() {
	if (process.platform !== 'win32') throw new Error('Visual Studio Generator is only supported on Windows')

	const findVisualStudioLib = await import('../../lib/import/find-visualstudio.js')

	let selectedVs: FindVisualStudioResult | null = null
	try {
		selectedVs = await findVisualStudioLib.default.findVisualStudio(
			process.versions.node,
			undefined, // TODO: does this need to respect: npm config msvs_version,
		)
	} catch (e) {
		// Log error?
	}
	if (!selectedVs) return null

	const cmakeBinPath = path.join(selectedVs.path, 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin/cmake.exe')

	try {
		const stat = await fs.stat(cmakeBinPath)
		if (stat.isFile()) {
			return cmakeBinPath
		}
	} catch (e) {
		// Ignore
	}

	// Nothing matched
	return null
}
