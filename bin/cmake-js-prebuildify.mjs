#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import os from 'os'
import { createRequire } from 'module'
import { getPrebuildName } from '../lib/prebuild.js'
import cp from 'child_process'

/**
 * Rename a binding file and move to the prebuilds folder, named according to the supplied parameters.
 */

const require = createRequire(import.meta.url)
const version = require("../package").version;

const yargs = require("yargs")
    .usage("CMake.js " + version + "\n\nUsage: $0 [<command>] [options]")
    .version(version)
    .options({
        source: {
            demand: true,
            describe: "path to the built binary",
            type: "string"
        },
        name: {
            demand: true,
            describe: 'name of the module',
            type: 'string'
        },
        strip: {
            demand: false,
            describe: 'strip file of debug symbols',
            type: 'boolean'
        },
        libc: {
            demand: false,
            describe: 'libc environment',
            type: 'string'
        },
        napi_version: {
            demand: false,
            describe: 'node-api version',
            type: 'string'
        },
        runtime: {
            demand: false,
            describe: 'runtime',
            type: 'string'
        },
        arch: {
            demand: false,
            describe: 'override the architecture',
            type: 'string'
        },
        platform: {
            demand: false,
            describe: 'override the platform',
            type: 'string'
        }
    })

const argv = yargs.argv;

const targetDir = path.join(process.cwd(), 'prebuilds')
const sourceFile = path.join(process.cwd(), argv.source)

if (!fs.existsSync(sourceFile)) {
    console.error(`Built binary does not exist!`)
    process.exit(1)
}

let libc = argv.libc
if (libc === 'glibc') libc = null

// Determine the target filename
const prebuildName = getPrebuildName({
    arch: argv.arch || os.arch(),
    platform: argv.platform || os.platform(),
    name: argv.name,
    libc: libc,
    napi_version: argv.napi_version,
    runtime: argv.runtime || 'node'
})

// Make sure the directory exists
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
}

// Copy the bindings file
const destFile = path.join(targetDir, prebuildName)
fs.copyFileSync(sourceFile, destFile)

if (argv.strip) {
    if (os.platform() === 'linux') {
        cp.spawnSync('strip', [destFile, '--strip-all'])
    } else if (os.platform() === 'darwin') {
        cp.spawnSync('strip', [destFile, '-Sx'])
    }
}

console.log('Done')
