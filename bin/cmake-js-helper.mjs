#!/usr/bin/env node
// @ts-check

import fs from 'node:fs/promises'
import semver from 'semver'
import BuildDepsDownloader from '../dist/buildDeps.mjs'
import envPaths from 'env-paths'
import debug from 'debug'

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
		}

		// If the user specified a runtime, use that instead
		if (process.argv[3] && process.argv[4]) {
			buildTarget.runtime = process.argv[3]
			buildTarget.runtimeVersion = process.argv[4]
			// @ts-expect-error types don't align because runtimeArch is Architecture
			buildTarget.runtimeArch = process.argv[5] || buildTarget.runtimeArch
		}

		// This is intended to be set by the user, not cmake, so is safe to be an env var
		const depsStorageDir = process.env.CMAKEJS_CACHE_DIR || envPaths('cmake-js').cache

		const buildDepsDownloader = new BuildDepsDownloader(depsStorageDir, buildTarget, debug('cmake-js:buildDeps'))

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
