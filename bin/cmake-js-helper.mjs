#!/usr/bin/env node
// @ts-check

import fs from 'node:fs/promises'
import semver from 'semver'
import BuildDepsDownloader from '../rewrite/dist/buildDeps.mjs'
import path from 'node:path'
import os from 'node:os'

/*
 * This file is a collection of helper functions for the cmake-js package.
 * It gets called automatically by the CMake scripts, to perform some tasks that are hard
 * to do in CMake, but easy to do in Node.js
 */

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
	case 'nodejs_dev_headers': {
		// Use the current runtime
		const buildTarget = {
			runtime: 'node',
			runtimeVersion: process.versions.node,
			runtimeArch: process.arch,
		} // TODO - respect env vars for overrides

		let depsStorageDir = path.join(os.homedir(), '.cmake-js') // TODO - xdg-dir?
		if (process.env.CMAKE_JS_CACHE_DIR) {
			depsStorageDir = process.env.CMAKE_JS_CACHE_DIR
		}

		const buildDepsDownloader = new BuildDepsDownloader(depsStorageDir, buildTarget, console.error)

		await buildDepsDownloader.ensureDownloaded()

		console.log(buildDepsDownloader.internalPath)
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
	if (runtime === 'nw' && semver.gte(version, '0.90.0')) {
		return 20
	}
	if (runtime === 'nw' && semver.gte(version, '0.70.0')) {
		// TODO - this version is a guess
		return 17
	}

	// Minimum for supported versions is 14
	return 14
}
