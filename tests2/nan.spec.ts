import { beforeAll, beforeEach, describe, test } from 'vitest'
import { appendSystemCmakeArgs, CmakeTestRunner, getGeneratorsForPlatform } from './test-runner'
import DistDownloader from '../rewrite/src/dist.mjs'
import { TargetOptions } from '../rewrite/src/runtimePaths.mjs'
import semver from 'semver'

const runtimesAndVersions: Omit<TargetOptions, 'runtimeArch'>[] = [
	{ runtime: 'node', runtimeVersion: '14.15.0' },
	{ runtime: 'node', runtimeVersion: '16.10.0' },
	{ runtime: 'node', runtimeVersion: '18.16.1' },
	{ runtime: 'node', runtimeVersion: '20.18.1' },
	{ runtime: 'node', runtimeVersion: '22.14.0' },

	{ runtime: 'electron', runtimeVersion: '18.2.1' },
	{ runtime: 'electron', runtimeVersion: '31.5.0' },
	{ runtime: 'electron', runtimeVersion: '35.1.5' },

	{ runtime: 'nw', runtimeVersion: '0.64.0' },
	{ runtime: 'nw', runtimeVersion: '0.79.0' },
	{ runtime: 'nw', runtimeVersion: '0.98.2' },
]

function getArchsForRuntime(runtime: Omit<TargetOptions, 'runtimeArch'>): TargetOptions[] {
	switch (process.platform) {
		case 'linux':
			return [{ ...runtime, runtimeArch: process.arch }]
		case 'darwin':
			return [
				{ ...runtime, runtimeArch: 'x64' },
				{ ...runtime, runtimeArch: 'arm64' },
			]
		case 'win32': {
			const res = [
				{ ...runtime, runtimeArch: 'x64' },
				{ ...runtime, runtimeArch: 'x86' },
			]

			// Only newer targets support arm64
			if (runtime.runtime === 'node' && semver.gte(runtime.runtimeVersion, '20.0.0')) {
				// TODO - include some electron versions too
				res.push({ ...runtime, runtimeArch: 'arm64' })
			}

			return res
		}
		default:
			throw new Error(`Unsupported platform: ${process.platform}`)
	}
}

describe('nan', () => {
	const testRunner = new CmakeTestRunner('nan')

	beforeAll(async () => {
		await testRunner.prepareProject()
	})

	for (const generator of getGeneratorsForPlatform()) {
		for (const runtime of runtimesAndVersions) {
			for (const fullRuntime of getArchsForRuntime(runtime)) {
				describe(`Using generator "${generator}" (${fullRuntime.runtime}@${fullRuntime.runtimeVersion} ${fullRuntime.runtimeArch})`, () => {
					const distDownloader = new DistDownloader(fullRuntime)

					beforeEach(async () => {
						await distDownloader.ensureDownloaded()

						testRunner.generator = generator
						testRunner.nodeDevDirectory = distDownloader.internalPath
					})

					test('cmake direct invocation', async () => {
						const args: string[] = []

						appendSystemCmakeArgs(args, fullRuntime.runtimeArch)

						await testRunner.testInvokeCmakeDirectSimple(args)
						// TODO - assert binary was built correct?
					})

					if (process.platform === 'darwin') {
						test('cmake direct invocation multiarch', async () => {
							await testRunner.testInvokeCmakeDirectSimple(['-DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"'])

							// TODO - assert binary is universal
						})
					}
				})
			}
		}
	}
})
