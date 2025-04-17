import { beforeAll, describe, test } from 'vitest'
import { CmakeTestRunner, getGeneratorsForPlatform } from './test-runner'

describe('node-api', () => {
	const testRunner = new CmakeTestRunner('node-api')

	beforeAll(async () => {
		await testRunner.prepareProject()
	})

	for (const generator of getGeneratorsForPlatform()) {
		describe(`Using generator "${generator}"`, () => {
			test('cmake direct invocation', async () => {
				await testRunner.testInvokeCmakeDirect(generator)
			})

			if (process.platform === 'darwin') {
				test('cmake direct invocation multiarch', async () => {
					await testRunner.testInvokeCmakeDirect(generator, ['-DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"'])

					// TODO - assert binary is universal
				})
			}

			if (process.platform === 'win32') {
				if (process.arch !== 'ia32') {
					test('cmake direct invocation Win32', async () => {
						await testRunner.testInvokeCmakeDirect(generator, ['-A', 'Win32'], true)
					})
				}

				if (process.arch !== 'x64') {
					test('cmake direct invocation x64', async () => {
						await testRunner.testInvokeCmakeDirect(generator, ['-A', 'x64'], true)
					})
				}
				if (process.arch !== 'arm64') {
					test('cmake direct invocation arm64', async () => {
						await testRunner.testInvokeCmakeDirect(generator, ['-A', 'ARM64'], true)
					})
				}
			}
		})
	}

	// test('build', async () => {

	//     await runCommand([''])
	//     //

	// })
})
