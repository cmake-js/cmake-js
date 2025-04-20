import { beforeAll, describe, expect, test } from 'vitest'
import Downloader from '../rewrite/src/downloader.mts'
import { CmakeTestRunner, NODE_DEV_CACHE_DIR } from '../tests-cmake/test-runner'
import path from 'node:path'
import fs from 'node:fs/promises'
import { runCommand } from '../rewrite/src/processHelpers.mts'

describe('CMake versions check', () => {
	if (process.platform !== 'linux' || process.arch !== 'x64') {
		test('Unsupported platform', () => {
			// Tests are skipped unless explicitly enabld
			expect(false).toBe(true)
		})
		return
	}

	const cmakeVersions = [
		'3.31.7',
		'3.30.8',
		'3.25.3',
		'3.22.1', // ubuntu 22.04
		'3.21.7',
		'3.20.6', // MSVC 2019
		'3.16.3', // ubuntu 20.04
		'3.15.0', // minimum supported version
	]

	for (const cmakeVersion of cmakeVersions) {
		describe(`Using CMake v${cmakeVersion}`, () => {
			const downloadPath = path.join(NODE_DEV_CACHE_DIR, 'cmake', cmakeVersion)
			const cmakeExecutable = path.join(downloadPath, 'bin', 'cmake')

			beforeAll(async () => {
				const downloader = new Downloader(console.debug)

				const stat = await fs.stat(cmakeExecutable).catch(() => null)
				if (!stat || !stat.isFile()) {
					await fs.mkdir(downloadPath, { recursive: true })

					await downloader.downloadTgz(
						{
							url: `https://github.com/Kitware/CMake/releases/download/v${cmakeVersion}/cmake-${cmakeVersion}-linux-x86_64.tar.gz`,
							sum: null,
							hash: null,
						},
						100_000_000, // arbitrary 100mb
						{
							cwd: downloadPath,
							strip: 1,
						},
					)
				}
			})

			test('node-api', async () => {
				console.log('ls download')
				await runCommand(['ls', downloadPath])
				console.log('ls bin')
				await runCommand(['ls', path.join(downloadPath, 'bin')])

				const testRunner = new CmakeTestRunner('node-api')
				testRunner.cmakePath = cmakeExecutable

				// Ensure the correct cmake is being used
				const versionStr = await testRunner.getCmakeVersion()
				expect(versionStr).toContain(`cmake version ${cmakeVersion}\n`)

				// await testRunner.testInvokeCmakeDirectSimple()
			})

			test('nan', async () => {
				const testRunner = new CmakeTestRunner('nan')
				testRunner.cmakePath = cmakeExecutable

				// Ensure the correct cmake is being used
				const versionStr = await testRunner.getCmakeVersion()
				expect(versionStr).toContain(`cmake version ${cmakeVersion}\n`)

				// await testRunner.testInvokeCmakeDirectSimple()
			})
		})
	}

	// TODO
})
