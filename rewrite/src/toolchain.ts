import fs from 'fs/promises'
import which from 'which'

export async function findCmake(): Promise<string> {
	const overridePath = process.env['CMAKE_JS_CMAKE_PATH']
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
