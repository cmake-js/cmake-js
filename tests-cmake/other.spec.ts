import { describe, test } from 'vitest'
import { CmakeTestRunner } from './test-runner'

describe('other projects', () => {
	test('cmake direct invocation', async () => {
		const testRunner = new CmakeTestRunner('node-addon-api-subdir')
		await testRunner.prepareProject()

		await testRunner.testInvokeCmakeDirectCustom({
			sourceDir: '../src',
			cmakeArgs: [],
			expectedLaunchResult: null,
		})
	})
})
