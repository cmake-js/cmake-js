/// <reference types="vitest" />
import { defineConfig } from 'vite'

let testTimeout = 30_000
if (process.env.CI) testTimeout *= 3
if (process.platform === 'win32') testTimeout *= 3

let hookTimeout = 30_000
if (process.platform === 'win32') hookTimeout *= 3

export default defineConfig({
	test: {
		hookTimeout: hookTimeout,
		testTimeout: testTimeout,
		fileParallelism: !process.env.CI,
	},
})
