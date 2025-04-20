import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { execFile } from '../rewrite/src/processHelpers.mjs'
import { temporaryDirectoryTask, temporaryFileTask } from 'tempy'
import fs from 'node:fs/promises'
import { nanoid } from 'nanoid'

function trimTrailingSlash(str: string) {
	return str.endsWith('/') ? str.slice(0, -1) : str
}

const projectPath = trimTrailingSlash(fileURLToPath(new URL('../', import.meta.url)))
const cmakeJsCliPath = fileURLToPath(new URL('../bin/cmake-js-next.mjs', import.meta.url))
const fakeCmakePath = fileURLToPath(new URL('./fake-cmake', import.meta.url))

describe('cmake-js-next cli', () => {
	async function parseFakeCmakeFile(filePath: string) {
		const output = await fs.readFile(filePath, 'utf8')
		return output
			.split('\n')
			.filter((l) => !!l)
			.map((l) => {
				return l.replaceAll(process.execPath, '/path/to/current/node').replaceAll(projectPath, '/cmake-js/src')
			})
	}

	async function invokeCmakeJs(args: string[], expectedExitCode?: number) {
		return temporaryFileTask(async (tempPath) => {
			await fs.writeFile(tempPath, '')

			try {
				const outputStr = await execFile(['node', cmakeJsCliPath, ...args], {
					env: {
						// Override cmake to our fake version
						CMAKEJS_CMAKE_PATH: fakeCmakePath,
						CMAKE_JS_TEST_OUTPUT_FILE: tempPath,
						CMAKE_JS_TEST_EXIT_CODE: expectedExitCode !== undefined ? String(expectedExitCode) : undefined,
					},
				})

				return {
					outputStr,
					error: null,
					cmakeCommands: await parseFakeCmakeFile(tempPath),
				}
			} catch (e) {
				return {
					outputStr: null,
					error: e,
					cmakeCommands: await parseFakeCmakeFile(tempPath),
				}
			}
		})
	}

	describe('autobuild', () => {
		test('simple', async () => {
			const res = await invokeCmakeJs(['autobuild'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				'(/cmake-js/src/build) cmake .. -DNODE_EXECUTABLE=/path/to/current/node',
				'(/cmake-js/src/build) cmake --build .',
			])
		})

		test('swallow extra args', async () => {
			const res = await invokeCmakeJs(['autobuild', '--test'])

			expect(res.error).not.toBe(null)
			expect(res.cmakeCommands).toHaveLength(0)
		})

		test('cmake extra args', async () => {
			const res = await invokeCmakeJs(['autobuild', '--', '--test'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				'(/cmake-js/src/build) cmake .. -DNODE_EXECUTABLE=/path/to/current/node --test',
				'(/cmake-js/src/build) cmake --build .',
			])
		})

		test('absolute build dir', async () => {
			await temporaryDirectoryTask(async (tempDir) => {
				await fs.rm(tempDir, { recursive: true })

				const res = await invokeCmakeJs(['autobuild', '--out', tempDir])

				expect(res.error).toBe(null)
				expect(res.cmakeCommands).toEqual([
					`(${tempDir}) cmake ../../cmake-js/src -DNODE_EXECUTABLE=/path/to/current/node`,
					`(${tempDir}) cmake --build .`,
				])
			})
		})

		test('relative build dir', async () => {
			const dirname = nanoid()
			const fullpath = new URL(`../${dirname}`, import.meta.url)
			try {
				const res = await invokeCmakeJs(['autobuild', '--out', dirname])

				expect(res.error).toBe(null)
				expect(res.cmakeCommands).toEqual([
					`(/cmake-js/src/${dirname}) cmake .. -DNODE_EXECUTABLE=/path/to/current/node`,
					`(/cmake-js/src/${dirname}) cmake --build .`,
				])
			} finally {
				await fs.rm(fullpath, { recursive: true, force: true })
			}
		})

		test('with runtime', async () => {
			const res = await invokeCmakeJs(['autobuild', '--runtime', 'test123'])

			expect(res.error?.message).toMatch('--runtimeVersion must')
			expect(res.cmakeCommands).toHaveLength(0)
		})

		test('with runtime and version', async () => {
			const res = await invokeCmakeJs(['autobuild', '--runtime', 'test123', '--runtimeVersion', '1.2.3'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				'(/cmake-js/src/build) cmake .. -DNODE_EXECUTABLE=/path/to/current/node -DCMAKEJS_TARGET_RUNTIME=test123 -DCMAKEJS_TARGET_RUNTIME_VERSION=1.2.3',
				'(/cmake-js/src/build) cmake --build .',
			])
		})

		test('with runtime, version and arch', async () => {
			const res = await invokeCmakeJs([
				'autobuild',
				'--runtime',
				'test123',
				'--runtimeVersion',
				'1.2.3',
				'--runtimeArch',
				'xABC',
			])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				'(/cmake-js/src/build) cmake .. -DNODE_EXECUTABLE=/path/to/current/node -DCMAKEJS_TARGET_RUNTIME=test123 -DCMAKEJS_TARGET_RUNTIME_VERSION=1.2.3 -DCMAKEJS_TARGET_RUNTIME_ARCH=xABC',
				'(/cmake-js/src/build) cmake --build .',
			])
		})
	})

	describe('configure', () => {
		test('simple', async () => {
			const res = await invokeCmakeJs(['configure'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				//
				'(/cmake-js/src/build) cmake .. -DNODE_EXECUTABLE=/path/to/current/node',
			])
		})

		test('swallow extra args', async () => {
			const res = await invokeCmakeJs(['configure', '--test'])

			expect(res.error).not.toBe(null)
			expect(res.cmakeCommands).toHaveLength(0)
		})

		test('cmake extra args', async () => {
			const res = await invokeCmakeJs(['configure', '--', '--test'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				'(/cmake-js/src/build) cmake .. -DNODE_EXECUTABLE=/path/to/current/node --test',
			])
		})

		test('absolute build dir', async () => {
			await temporaryDirectoryTask(async (tempDir) => {
				await fs.rm(tempDir, { recursive: true })

				const res = await invokeCmakeJs(['configure', '--out', tempDir])

				expect(res.error).toBe(null)
				expect(res.cmakeCommands).toEqual([
					`(${tempDir}) cmake ../../cmake-js/src -DNODE_EXECUTABLE=/path/to/current/node`,
				])
			})
		})

		test('relative build dir', async () => {
			const dirname = nanoid()
			const fullpath = new URL(`../${dirname}`, import.meta.url)
			try {
				const res = await invokeCmakeJs(['configure', '--out', dirname])

				expect(res.error).toBe(null)
				expect(res.cmakeCommands).toEqual([
					//
					`(/cmake-js/src/${dirname}) cmake .. -DNODE_EXECUTABLE=/path/to/current/node`,
				])
			} finally {
				await fs.rm(fullpath, { recursive: true, force: true })
			}
		})

		test('with runtime', async () => {
			const res = await invokeCmakeJs(['configure', '--runtime', 'test123'])

			expect(res.error?.message).toMatch('--runtimeVersion must')
			expect(res.cmakeCommands).toHaveLength(0)
		})

		test('with runtime and version', async () => {
			const res = await invokeCmakeJs(['configure', '--runtime', 'test123', '--runtimeVersion', '1.2.3'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				'(/cmake-js/src/build) cmake .. -DNODE_EXECUTABLE=/path/to/current/node -DCMAKEJS_TARGET_RUNTIME=test123 -DCMAKEJS_TARGET_RUNTIME_VERSION=1.2.3',
			])
		})

		test('with runtime, version and arch', async () => {
			const res = await invokeCmakeJs([
				'configure',
				'--runtime',
				'test123',
				'--runtimeVersion',
				'1.2.3',
				'--runtimeArch',
				'xABC',
			])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				'(/cmake-js/src/build) cmake .. -DNODE_EXECUTABLE=/path/to/current/node -DCMAKEJS_TARGET_RUNTIME=test123 -DCMAKEJS_TARGET_RUNTIME_VERSION=1.2.3 -DCMAKEJS_TARGET_RUNTIME_ARCH=xABC',
			])
		})
	})

	describe('build', () => {
		test('simple', async () => {
			const res = await invokeCmakeJs(['build'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				//
				'(/cmake-js/src/build) cmake --build .',
			])
		})

		test('swallow extra args', async () => {
			const res = await invokeCmakeJs(['build', '--test'])

			expect(res.error).not.toBe(null)
			expect(res.cmakeCommands).toHaveLength(0)
		})

		test('cmake extra args', async () => {
			const res = await invokeCmakeJs(['build', '--', '--test'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				//
				'(/cmake-js/src/build) cmake --build . --test',
			])
		})

		test('absolute build dir', async () => {
			await temporaryDirectoryTask(async (tempDir) => {
				const res = await invokeCmakeJs(['build', '--out', tempDir])

				expect(res.error).toBe(null)
				expect(res.cmakeCommands).toEqual([
					//
					`(${tempDir}) cmake --build .`,
				])
			})
		})

		test('relative build dir', async () => {
			const dirname = nanoid()
			const fullpath = new URL(`../${dirname}`, import.meta.url)
			try {
				await fs.mkdir(fullpath, { recursive: true })

				const res = await invokeCmakeJs(['build', '--out', dirname])

				expect(res.error).toBe(null)
				expect(res.cmakeCommands).toEqual([
					//
					`(/cmake-js/src/${dirname}) cmake --build .`,
				])
			} finally {
				await fs.rm(fullpath, { recursive: true, force: true })
			}
		})

		test('missing build dir', async () => {
			const res = await invokeCmakeJs(['build', '--out', 'tmp/fake-dir'])

			expect(res.error?.message).toMatch('Output directory does not exist')
			expect(res.cmakeCommands).toHaveLength(0)
		})
	})

	describe('clean', () => {
		test('simple', async () => {
			const res = await invokeCmakeJs(['clean'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				//
				'(/cmake-js/src/build) cmake --build . --target clean',
			])
		})

		test('swallow extra args', async () => {
			const res = await invokeCmakeJs(['clean', '--test'])

			expect(res.error).not.toBe(null)
			expect(res.cmakeCommands).toHaveLength(0)
		})

		test('cmake extra args', async () => {
			const res = await invokeCmakeJs(['clean', '--', '--test'])

			expect(res.error).toBe(null)
			expect(res.cmakeCommands).toEqual([
				//
				'(/cmake-js/src/build) cmake --build . --target clean --test',
			])
		})

		test('absolute build dir', async () => {
			await temporaryDirectoryTask(async (tempDir) => {
				const res = await invokeCmakeJs(['clean', '--out', tempDir])

				expect(res.error).toBe(null)
				expect(res.cmakeCommands).toEqual([
					//
					`(${tempDir}) cmake --build . --target clean`,
				])
			})
		})

		test('relative build dir', async () => {
			const dirname = nanoid()
			const fullpath = new URL(`../${dirname}`, import.meta.url)
			try {
				await fs.mkdir(new URL(`../${dirname}`, import.meta.url), { recursive: true })

				const res = await invokeCmakeJs(['clean', '--out', dirname])

				expect(res.error).toBe(null)
				expect(res.cmakeCommands).toEqual([
					//
					`(/cmake-js/src/${dirname}) cmake --build . --target clean`,
				])
			} finally {
				await fs.rm(fullpath, { recursive: true, force: true })
			}
		})

		test('missing build dir', async () => {
			const res = await invokeCmakeJs(['clean', '--out', 'tmp/fake-dir'])

			expect(res.error?.message).toMatch('Output directory does not exist')
			expect(res.cmakeCommands).toHaveLength(0)
		})
	})
})
