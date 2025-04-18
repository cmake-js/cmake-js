#!/usr/bin/env node

import fs from 'fs/promises'
import semver from 'semver'

const regexPath = /\/(\w+)-(\w+)\/v([0-9]+.[0-9]+.[0-9]+)(\/?)$/

switch (process.argv[2]) {
	case 'version': {
		const packageJsonStr = await fs.readFile(new URL('../package.json', import.meta.url))
		const packageJson = JSON.parse(packageJsonStr.toString())
		console.log(packageJson.version)
		break
	}
	case 'cxx_standard': {
		const match = regexPath.exec(process.argv[3].replaceAll('\\', '/'))
		if (!match) {
			console.error(`Invalid path: ${process.argv[3]}`)
			process.exit(1)
		}

		console.log(chooseCxxStandard(match[1], match[3]))
		break
	}
	default:
		console.error(`Unknown command: ${process.argv[2]}`)
		process.exit(5)
}

function chooseCxxStandard(runtime, version) {
	if (runtime === 'node' && semver.gte(version, '20.0.0')) {
		return 17
	}
	if (runtime === 'electron' && semver.gte(version, '32.0.0')) {
		return 20
	}
	if (runtime === 'electron' && semver.gte(version, '29.0.0')) {
		return 17
	}

	// Minimum for supported versions is 14
	return 14
}
