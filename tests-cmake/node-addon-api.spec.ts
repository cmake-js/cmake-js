import { beforeAll, beforeEach, describe, test } from 'vitest'
import { appendSystemCmakeArgs, CmakeTestRunner, getGeneratorsForPlatform } from './test-runner'

describe('node-addon-api', () => {
	const testRunner = new CmakeTestRunner('node-addon-api')

	beforeAll(async () => {
		await testRunner.prepareProject()
	})

	for (const generator of getGeneratorsForPlatform()) {
		describe(`Using generator "${generator}"`, () => {
			beforeEach(() => {
				testRunner.generator = generator
			})

			test('cmake direct invocation', async () => {
				const args: string[] = []
				appendSystemCmakeArgs(args, process.arch)

				await testRunner.testInvokeCmakeDirect(args)
			})

			if (process.platform === 'darwin') {
				test('cmake direct invocation multiarch', async () => {
					await testRunner.testInvokeCmakeDirect(['-DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"'])

					// TODO - assert binary is universal
				})
			}

			if (process.platform === 'win32') {
				if (process.arch !== 'ia32') {
					test('cmake direct invocation Win32', async () => {
						await testRunner.testInvokeCmakeDirect(['-A', 'Win32'], true)
					})
				}

				if (process.arch !== 'x64') {
					test('cmake direct invocation x64', async () => {
						await testRunner.testInvokeCmakeDirect(['-A', 'x64'], true)
					})
				}
				if (process.arch !== 'arm64') {
					test('cmake direct invocation arm64', async () => {
						await testRunner.testInvokeCmakeDirect(['-A', 'ARM64'], true)
					})
				}
			}
		})
	}
})
