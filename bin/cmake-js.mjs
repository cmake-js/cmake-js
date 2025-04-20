#!/usr/bin/env node
'use strict'

const nodeMajor = process.versions.node.split('.')[0]
if (nodeMajor < 18) {
	console.error('cmake-js requires Node.js 18 or greater. Please update your Node.js installation.')
	process.exit(1)
}

// Call into the compiled ts code
await import('../rewrite/dist/cmake-js-bin.mjs')
