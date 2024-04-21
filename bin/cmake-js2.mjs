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
	const generator = args.generator
	const sourceDir = (args.directory && path.resolve(args.directory)) || process.cwd()
	const buildDir = path.join(
		(args.out && (path.isAbsolute(args.out) ? args.out : path.join(sourceDir, path.resolve(args.out)))) ||
			path.join(sourceDir, 'build'),
		config,
	)

	const preferMake = !!args['prefer-make']
	const preferXcode = !!args['prefer-xcode']

	console.log('dirs', sourceDir, buildDir)
	return {
		sourceDir,
		buildDir,
		config,
		generator,

		preferMake,
		preferXcode,
	}
}

async function wrapCommand(fn) {
	return async (args) => {
		const options = parseOptions(args)
		const buildSystem = new BuildSystem(options)

		// try {
		await fn(buildSystem, args)
		// } catch (e) {
		// 	console.error('fail', e)
		// 	process.exit(1)
		// }
	}
}

async function runCmake(buildSystem, args) {
	try {
		// TODO - replace #GENERATOR# with autoselected generator, to simplify windows
		await buildSystem.invokeCmake(args._.slice(1))
	} catch (e) {
		console.error('fail', e)
	}
}

async function runCmakePath(buildSystem) {
	try {
		const cmakePath = await buildSystem.findCmake()
		console.log(cmakePath)
	} catch (e) {
		console.log(e.message)
		process.exit(1)
	}
}

async function runConfigure(buildSystem, args) {
	await buildSystem.configure(args._.slice(1))
}

async function runBuild(buildSystem, args) {
	await buildSystem.ensureConfigured(args._.slice(1))
	await buildSystem.build({
		target: args.target,
	})
}

async function runClean(buildSystem, args) {
	await buildSystem.clean()
}

async function runListGenerators(buildSystem, args) {
	const generators = await buildSystem.getGenerators()

	console.log('Available generators:')
	console.log(generators.map((g) => ' - ' + g).join('\n'))
}

async function runSelectGenerators(buildSystem, args) {
	const bestGenerator = await buildSystem.selectGeneratorAndPlatform(args)

	if (!bestGenerator) {
		console.error('No suitable generator found')
		process.exit(1)
	} else {
		console.log(bestGenerator.generator + (bestGenerator.platform ? ' ' + bestGenerator.platform : ''))
	}
}

const args = await yargs(hideBin(process.argv))
	// .parserConfiguration({ // TODO - this would be nice to have
	// 	'unknown-options-as-args': true,
	// })
	.usage('CMake.js ' + packageJson.version + '\n\nUsage: $0 [<command>] [options]')
	.version(packageJson.version)
	.command('cmake', 'Invoke cmake with the given arguments', {}, wrapCommand(runCmake))
	.command('cmake-path', 'Get the path of the cmake binary used', {}, wrapCommand(runCmakePath))
	.command('configure', 'Configure CMake project', {}, wrapCommand(runConfigure))
	.command('build', 'Build the project (will configure first if required)', {}, wrapCommand(runBuild))
	.command('clean', 'Clean the project directory', {}, wrapCommand(runClean))
	// 	.command('reconfigure', 'Clean the project directory then configure the project')
	// 	.command('rebuild', 'Clean the project directory then build the project')
	// 	.command('compile', 'Build the project, and if build fails, try a full rebuild')
	.command('list-generators', 'List available generators', {}, wrapCommand(runListGenerators))
	.command('select-generator', 'Select the best available generators', {}, wrapCommand(runSelectGenerators))
	.demandCommand()
	.options({
		// 		l: {
		// 			alias: 'log-level',
		// 			demand: false,
		// 			describe: 'set log level (' + logLevels.join(', ') + '), default is info',
		// 			type: 'string',
		// 		},
		config: {
			// alias: 'B',
			demand: false,
			describe: "specify build configuration (Debug, RelWithDebInfo, Release), will ignore '--debug' if specified",
			type: 'string',
		},
		'prefer-make': {
			// alias: 'm',
			demand: false,
			describe: 'use Unix Makefiles generator even if Ninja is available (Posix)',
			type: 'boolean',
		},
		'prefer-xcode': {
			// alias: 'x',
			demand: false,
			describe: 'use Xcode generator instead of Unix Makefiles',
			type: 'boolean',
		},
		generator: {
			// alias: 'G',
			demand: false,
			describe: 'use specified generator',
			type: 'string',
		},
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

// // Setup log level:

// if (argv.l && logLevels.includes(argv.l)) {
// 	log.level = argv.l
// 	log.resume()
// }

// const options = {
// 	platform: argv.A,
// 	arch: argv.a,
// 	silent: argv.i,
// 	out: argv.O,
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
