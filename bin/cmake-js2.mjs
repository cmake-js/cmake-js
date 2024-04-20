#!/usr/bin/env node
'use strict'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs/promises'
import { runCommand } from '../rewrite/dist/processHelpers.js'
import { findCmake } from '../rewrite/dist/toolchain.js'

const packageJsonStr = await fs.readFile(new URL('../package.json', import.meta.url))
const packageJson = JSON.parse(packageJsonStr.toString())

async function runCmake(args) {
	try {
		// TODO - replace #GENERATOR# with autoselected generator, to simplify windows
		const cmakePath = await findCmake()
		await runCommand([cmakePath, ...args._.slice(1)])
	} catch (e) {
		console.error('fail', e)
	}
}

async function runCmakePath() {
	try {
		const cmakePath = await findCmake()
		console.log(cmakePath)
	} catch (e) {
		console.log(e.message)
		process.exit(1)
	}
}

const args = await yargs(hideBin(process.argv))
	.usage('CMake.js ' + packageJson.version + '\n\nUsage: $0 [<command>] [options]')
	.version(packageJson.version)
	.command('cmake', 'Invoke cmake with the given arguments', {}, runCmake)
	.command('cmake-path', 'Get the path of the cmake binary used', {}, runCmakePath)
	// 	.command('configure', 'Configure CMake project')
	// 	.command('build', 'Build the project (will configure first if required)')
	// 	.command('clean', 'Clean the project directory')
	// 	.command('reconfigure', 'Clean the project directory then configure the project')
	// 	.command('rebuild', 'Clean the project directory then build the project')
	// 	.command('compile', 'Build the project, and if build fails, try a full rebuild')
	.demandCommand()
	.options({
		// 		l: {
		// 			alias: 'log-level',
		// 			demand: false,
		// 			describe: 'set log level (' + logLevels.join(', ') + '), default is info',
		// 			type: 'string',
		// 		},
		// 		d: {
		// 			alias: 'directory',
		// 			demand: false,
		// 			describe: "specify CMake project's directory (where CMakeLists.txt located)",
		// 			type: 'string',
		// 		},
		// D: {
		// 	alias: 'debug',
		// 	demand: false,
		// 	describe: 'build debug configuration',
		// 	type: 'boolean',
		// },
		// 		B: {
		// 			alias: 'config',
		// 			demand: false,
		// 			describe: "specify build configuration (Debug, RelWithDebInfo, Release), will ignore '--debug' if specified",
		// 			type: 'string',
		// 		},
		// 		c: {
		// 			alias: 'cmake-path',
		// 			demand: false,
		// 			describe: 'path of CMake executable',
		// 			type: 'string',
		// 		},
		// 		m: {
		// 			alias: 'prefer-make',
		// 			demand: false,
		// 			describe: 'use Unix Makefiles even if Ninja is available (Posix)',
		// 			type: 'boolean',
		// 		},
		// 		x: {
		// 			alias: 'prefer-xcode',
		// 			demand: false,
		// 			describe: 'use Xcode instead of Unix Makefiles',
		// 			type: 'boolean',
		// 		},
		// 		g: {
		// 			alias: 'prefer-gnu',
		// 			demand: false,
		// 			describe: 'use GNU compiler instead of default CMake compiler, if available (Posix)',
		// 			type: 'boolean',
		// 		},
		// 		G: {
		// 			alias: 'generator',
		// 			demand: false,
		// 			describe: 'use specified generator',
		// 			type: 'string',
		// 		},
		// 		t: {
		// 			alias: 'toolset',
		// 			demand: false,
		// 			describe: 'use specified toolset',
		// 			type: 'string',
		// 		},
		// 		A: {
		// 			alias: 'platform',
		// 			demand: false,
		// 			describe: 'use specified platform name',
		// 			type: 'string',
		// 		},
		// 		T: {
		// 			alias: 'target',
		// 			demand: false,
		// 			describe: 'only build the specified target',
		// 			type: 'string',
		// 		},
		// 		C: {
		// 			alias: 'prefer-clang',
		// 			demand: false,
		// 			describe: 'use Clang compiler instead of default CMake compiler, if available (Posix)',
		// 			type: 'boolean',
		// 		},
		// 		cc: {
		// 			demand: false,
		// 			describe: 'use the specified C compiler',
		// 			type: 'string',
		// 		},
		// 		cxx: {
		// 			demand: false,
		// 			describe: 'use the specified C++ compiler',
		// 			type: 'string',
		// 		},
		// 		r: {
		// 			alias: 'runtime',
		// 			demand: false,
		// 			describe: 'the runtime to use',
		// 			type: 'string',
		// 		},
		// 		v: {
		// 			alias: 'runtime-version',
		// 			demand: false,
		// 			describe: 'the runtime version to use',
		// 			type: 'string',
		// 		},
		// 		a: {
		// 			alias: 'arch',
		// 			demand: false,
		// 			describe: 'the architecture to build in',
		// 			type: 'string',
		// 		},
		// 		p: {
		// 			alias: 'parallel',
		// 			demand: false,
		// 			describe: 'the number of threads cmake can use',
		// 			type: 'number',
		// 		},
		// 		CD: {
		// 			demand: false,
		// 			describe: 'Custom argument passed to CMake in format: -D<your-arg-here>',
		// 			type: 'string',
		// 		},
		// 		i: {
		// 			alias: 'silent',
		// 			describe: 'Prevents CMake.js to print to the stdio',
		// 			type: 'boolean',
		// 		},
		// 		O: {
		// 			alias: 'out',
		// 			describe: 'Specify the output directory to compile to, default is projectRoot/build',
		// 			type: 'string',
		// 		},
	})
	.help()
	.parseAsync()

// const log = require('npmlog')
// const BuildSystem = require('../').BuildSystem
// const util = require('util')
// const version = require('../package').version
// const logLevels = ['silly', 'verbose', 'info', 'http', 'warn', 'error']

// const npmConfigData = require('rc')('npm')
// for (const [key, value] of Object.entries(npmConfigData)) {
// 	if (key.startsWith('cmake_js_')) {
// 		const option = key.substr(9)
// 		if (option.length === 1) {
// 			process.argv.push('-' + option)
// 		} else {
// 			process.argv.push('--' + option)
// 		}
// 		if (value) {
// 			process.argv.push(value)
// 		}
// 	}
// }

// const yargs = require('yargs')
// 	.usage('CMake.js ' + version + '\n\nUsage: $0 [<command>] [options]')
// 	.version(version)
// const argv = yargs.argv

// // If help, then print and exit:

// if (argv.h) {
// 	console.info(yargs.help())
// 	process.exit(0)
// }

// // Setup log level:

// if (argv.l && logLevels.includes(argv.l)) {
// 	log.level = argv.l
// 	log.resume()
// }

// log.silly('CON', 'argv:')
// log.silly('CON', util.inspect(argv))

// log.verbose('CON', 'Parsing arguments')

// // Extract custom cMake options
// const customOptions = {}
// for (const arg of process.argv) {
// 	if (arg.startsWith('--CD')) {
// 		const separator = arg.indexOf('=')
// 		if (separator < 5) continue
// 		const key = arg.substring(4, separator)
// 		const value = arg.substring(separator + 1)
// 		if (!value) continue
// 		customOptions[key] = value
// 	}
// }

// const options = {
// 	directory: argv.directory || null,
// 	debug: argv.debug,
// 	cmakePath: argv.c || null,
// 	generator: argv.G,
// 	toolset: argv.t,
// 	platform: argv.A,
// 	target: argv.T,
// 	preferMake: argv.m,
// 	preferXcode: argv.x,
// 	preferGnu: argv.g,
// 	preferClang: argv.C,
// 	cCompilerPath: argv.cc,
// 	cppCompilerPath: argv.cxx,
// 	runtime: argv.r,
// 	runtimeVersion: argv.v,
// 	arch: argv.a,
// 	cMakeOptions: customOptions,
// 	silent: argv.i,
// 	out: argv.O,
// 	config: argv.B,
// 	parallel: argv.p,
// 	extraCMakeArgs: argv._.slice(1),
// }

// log.verbose('CON', 'options:')
// log.verbose('CON', util.inspect(options))

// const command = argv._[0] || 'build'

// log.verbose('CON', 'Running command: ' + command)

// const buildSystem = new BuildSystem(options)

// function ifCommand(c, f) {
// 	if (c === command) {
// 		f()
// 		return true
// 	}
// 	return false
// }

// function exitOnError(promise) {
// 	promise.catch(function () {
// 		process.exit(1)
// 	})
// }

// function install() {
// 	exitOnError(buildSystem.install())
// }
// function configure() {
// 	exitOnError(buildSystem.configure())
// }
// function build() {
// 	exitOnError(buildSystem.build())
// }
// function clean() {
// 	exitOnError(buildSystem.clean())
// }
// function reconfigure() {
// 	exitOnError(buildSystem.reconfigure())
// }
// function rebuild() {
// 	exitOnError(buildSystem.rebuild())
// }
// function compile() {
// 	exitOnError(buildSystem.compile())
// }

// let done = ifCommand('install', install)
// done = done || ifCommand('configure', configure)
// done = done || ifCommand('build', build)
// done = done || ifCommand('clean', clean)
// done = done || ifCommand('reconfigure', reconfigure)
// done = done || ifCommand('rebuild', rebuild)
// done = done || ifCommand('compile', compile)
