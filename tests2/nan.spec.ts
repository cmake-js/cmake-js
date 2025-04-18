import { beforeAll, beforeEach, describe, test } from 'vitest'
import { CmakeTestRunner, getGeneratorsForPlatform } from './test-runner'
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
	// { runtime: 'electron', runtimeVersion: '31.5.1' }, // TODO - this fails about a deprecation warning
	{ runtime: 'electron', runtimeVersion: '35.1.5' },
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
						const args = []

						if (process.platform === 'win32') {
							switch(fullRuntime.runtimeArch) { 
								case 'x86':
									args.push('-A', 'Win32')
									break
								case 'x64':
									args.push('-A', 'x64')
									break
								case 'arm64':
									args.push('-A', 'ARM64')
									break
								default:
									throw new Error(`Unhandled arch: ${fullRuntime.runtimeArch}`)
							}
						}


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
