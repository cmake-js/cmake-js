import fs from 'node:fs/promises'
import which from 'which'

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
		const res = await which('cmake', { all: false, nothrow: true })
		if (!res) {
			throw new Error(
				`cmake not found in PATH. Please install cmake or set CMAKEJS_CMAKE_PATH to the cmake executable.`,
			)
		}
		return res
	}
}
