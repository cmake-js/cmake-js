/// <reference types="vitest" />
import { defineConfig } from 'vite'

let testTimeout = 30_000
if (process.env.CI) testTimeout *= 2
if (process.platform === 'win32') testTimeout *= 3

export default defineConfig({
	test: {
		hookTimeout: 30_000,
		testTimeout: testTimeout,
		fileParallelism: !process.env.CI,
	},
})
