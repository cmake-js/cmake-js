import { beforeAll, describe, test } from 'vitest'
import { CmakeTestRunner } from './test-runner'

describe('node-api', () => {
	const testRunner = new CmakeTestRunner('node-api')

	beforeAll(async () => {
		await testRunner.prepareProject()
	})

	test('cmake direct invocation', async () => {
		await testRunner.testInvokeCmakeDirect()
	})

	// test('build', async () => {

	//     await runCommand([''])
	//     //

	// })
})
