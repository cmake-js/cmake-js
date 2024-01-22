#!/usr/bin/env node

/**
 * This script is intended to be a minimal helper script which makes for easy invocation of `cmake`,
 * utilising the same logic to locate cmake and potentially fill in some parameters
 */

// TODO - a helper to replace #GENERATOR# with autoselected generator, to simplify windows

import { runCommand } from '../rewrite/dist/processHelpers.js'
import { findCmake } from '../rewrite/dist/toolchain.js'

const cmakePath = await findCmake()

await runCommand([cmakePath, ...process.argv.slice(2)])
