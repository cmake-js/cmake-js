import { beforeAll, describe, test } from 'vitest'
import { CmakeTestRunner, getGeneratorsForPlatform } from './test-runner'
import DistDownloader from '../rewrite/src/dist.mjs'
import path from 'node:path'
import { TargetOptions } from '../rewrite/src/runtimePaths.mjs'

const runtimesAndVersions: Omit<TargetOptions, 'runtimeArch'>[] = [
	{ runtime: 'node', runtimeVersion: '14.15.0' },
	{ runtime: 'node', runtimeVersion: '16.10.0' },
	{ runtime: 'node', runtimeVersion: '18.16.1' },
	{ runtime: 'node', runtimeVersion: '20.18.1' },
	{ runtime: 'node', runtimeVersion: '22.14.0' },
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
		case 'win32':
			return [
				{ ...runtime, runtimeArch: 'x64' },
				{ ...runtime, runtimeArch: 'x86' },
				{ ...runtime, runtimeArch: 'arm64' },
			]
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
		testRunner.generator = generator

		for (const runtime of runtimesAndVersions) {
			for (const fullRuntime of getArchsForRuntime(runtime)) {
				describe(`Using generator "${generator}" (${fullRuntime.runtime}@${fullRuntime.runtimeVersion} ${fullRuntime.runtimeArch})`, () => {
					const distDownloader = new DistDownloader(fullRuntime)
					testRunner.nodeDevDirectory = path.join(distDownloader.internalPath, 'include/node')

					beforeAll(async () => {
						await distDownloader.ensureDownloaded()
					})

					test('cmake direct invocation', async () => {
						await testRunner.testInvokeCmakeDirect([], true)
						// TODO - assert binary was built correct?
					})

					if (process.platform === 'darwin') {
						test('cmake direct invocation multiarch', async () => {
							await testRunner.testInvokeCmakeDirect(['-DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"'], true)

							// TODO - assert binary is universal
						})
					}
				})
			}
		}
	}
})
