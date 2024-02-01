#!/usr/bin/env node

import fs from 'fs/promises'

switch (process.argv[2]) {
	case 'version':
		const packageJsonStr = await fs.readFile(new URL('../package.json', import.meta.url))
		const packageJson = JSON.parse(packageJsonStr.toString())
		console.log(packageJson.version)
		break
	default:
		console.error(`Unknown command: ${process.argv[2]}`)
		process.exit(5)
}
