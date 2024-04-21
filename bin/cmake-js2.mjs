#!/usr/bin/env node
'use strict'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs/promises'
import path from 'path'
import { BuildSystem } from '../rewrite/dist/buildSystem.js'

const packageJsonStr = await fs.readFile(new URL('../package.json', import.meta.url))
const packageJson = JSON.parse(packageJsonStr.toString())

function parseOptions(args) {
	const config = args.config || 'Release'
	const sourceDir = (args.directory && path.resolve(args.directory)) || process.cwd()
	const buildDir = path.join(
		(args.out && (path.isAbsolute(args.out) ? args.out : path.join(sourceDir, path.resolve(args.out)))) ||
			path.join(sourceDir, 'build'),
		config,
	)

	console.log('dirs', sourceDir, buildDir)
	return { sourceDir, buildDir, config }
}

async function runCmake(args) {
	try {
		const options = parseOptions(args)
		const buildSystem = new BuildSystem(options)

		// TODO - replace #GENERATOR# with autoselected generator, to simplify windows
		await buildSystem.invokeCmake(args._.slice(1))
	} catch (e) {
		console.error('fail', e)
	}
}

async function runCmakePath() {
	try {
		const options = parseOptions(args)
		const buildSystem = new BuildSystem(options)
		const cmakePath = await buildSystem.findCmake()
		console.log(cmakePath)
	} catch (e) {
		console.log(e.message)
		process.exit(1)
	}
}

async function runConfigure(args) {
	const options = parseOptions(args)
	const buildSystem = new BuildSystem(options)

	await buildSystem.configure(args._.slice(1))
}

async function runBuild(args) {
	const options = parseOptions(args)
	const buildSystem = new BuildSystem(options)

	await buildSystem.ensureConfigured(args._.slice(1))
	await buildSystem.build({
		target: args.target,
		config: options.config,
	})
}

async function runClean(args) {
	const options = parseOptions(args)
	const buildSystem = new BuildSystem(options)

	await buildSystem.clean()
}

async function runListGenerators(args) {
	const options = parseOptions(args)
	const buildSystem = new BuildSystem(options)
	const generators = await buildSystem.getGenerators()

	console.log('Available generators:')
	console.log(generators.map((g) => ' - ' + g).join('\n'))
}

const args = await yargs(hideBin(process.argv))
	// .parserConfiguration({ // TODO - this would be nice to have
	// 	'unknown-options-as-args': true,
	// })
	.usage('CMake.js ' + packageJson.version + '\n\nUsage: $0 [<command>] [options]')
	.version(packageJson.version)
	.command('cmake', 'Invoke cmake with the given arguments', {}, runCmake)
	.command('cmake-path', 'Get the path of the cmake binary used', {}, runCmakePath)
	.command('configure', 'Configure CMake project', {}, runConfigure)
	.command('build', 'Build the project (will configure first if required)', {}, runBuild)
	.command('clean', 'Clean the project directory', {}, runClean)
	// 	.command('reconfigure', 'Clean the project directory then configure the project')
	// 	.command('rebuild', 'Clean the project directory then build the project')
	// 	.command('compile', 'Build the project, and if build fails, try a full rebuild')
	.command('list-generators', 'List available generators', {}, runListGenerators)
	.demandCommand()
	.options({
		// 		l: {
		// 			alias: 'log-level',
		// 			demand: false,
		// 			describe: 'set log level (' + logLevels.join(', ') + '), default is info',
		// 			type: 'string',
		// 		},
		// D: {
		// 	alias: 'debug',
		// 	demand: false,
		// 	describe: 'build debug configuration',
		// 	type: 'boolean',
		// },
		config: {
			// alias: 'B',
			demand: false,
			describe: "specify build configuration (Debug, RelWithDebInfo, Release), will ignore '--debug' if specified",
			type: 'string',
		},
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
		target: {
			// alias: 'T',
			demand: false,
			describe: 'only build the specified target',
			type: 'string',
		},
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
		// 		a: {
		// 			alias: 'arch',
		// 			demand: false,
		// 			describe: 'the architecture to build in',
		// 			type: 'string',
		// 		},
		// 		i: {
		// 			alias: 'silent',
		// 			describe: 'Prevents CMake.js to print to the stdio',
		// 			type: 'boolean',
		// 		},
		directory: {
			// alias: 'd',
			describe: 'Specify the source directory to compile, default is the current directory',
			type: 'string',
		},
		out: {
			// alias: 'out',
			describe: 'Specify the output directory to compile to, default is projectRoot/build',
			type: 'string',
		},
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
// 	arch: argv.a,
// 	silent: argv.i,
// 	out: argv.O,
// 	config: argv.B,
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
