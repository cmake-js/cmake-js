#!/usr/bin/env node

import path from 'path'
import { createRequire } from 'module'
import loadBinding from '../bindings.js'

/**
 * Equivalent of the prebuild-install command.
 * It expects a single parameter of path to a file containing the options passed when using require with the binding.
 * This makes sure that there is a binding available for the current architecture and platform, 
 * or the one specified by the npm_config_* environment variables.
 */

if (process.env.npm_config_build_from_source) {
    // Force a build from source
    process.exit(1)
}

if (process.argv.length < 3) {
    console.error(`Missing path to binding options`)
    process.exit(1)
}

const require = createRequire(import.meta.url)

try {
    // Load the options file
    const optionsPath = path.join(process.cwd(), process.argv[2])
    const options = require(optionsPath)

    // Find the correct bindings file
    const resolvedPath = loadBinding.resolve(process.cwd(), options, true)

    // Report result
    if (resolvedPath) {
        process.exit(0)
    } else {
        process.exit(1)
    }

} catch (e) {
    console.error(`Failed to check for bindings file!: ${e}`)
    process.exit(1)
}
