import yargs, { ArgumentsCamelCase } from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'node:fs/promises'
import path from 'node:path'
import { findCmake } from './findCmake.mjs'
import { runCommand } from './processHelpers.mjs'

const packageJsonStr = await fs.readFile(new URL('../../package.json', import.meta.url))
const packageJson = JSON.parse(packageJsonStr.toString())

function wrapCMakeCommand<T extends BaseArgs>(fn: (args: ArgumentsCamelCase<T>) => Promise<void>) {
	// Note: This does some trickery with the args, to make the types a little happier with the base arguments
	return async (args: ArgumentsCamelCase<Omit<T, keyof BaseArgs>>) => {
		// const options = parseOptions(args)
		// const buildSystem = new BuildSystem(options)
		try {
			await fn(args as any)
		} catch (e) {
			console.error('fail', e)
			process.exit(1)
		}
	}
}

interface BaseArgs {
	out: string
	silent: boolean
}

interface CmakeConfigureArgs extends BaseArgs {
	source?: string
}

async function cmakeConfigure(args: ArgumentsCamelCase<CmakeConfigureArgs>) {
	const cmakePath = await findCmake()

	await fs.mkdir(args.out, { recursive: true })

	// Source needs to be relative to the output directory, due to the change in cwd
	const pathToSourceFromOut = args.source
		? path.isAbsolute(args.source)
			? args.source
			: path.relative(args.out, path.resolve(args.source))
		: path.relative(args.out, process.cwd())

	const customArgs: string[] = []

	// If we know the executable path for certain, we can inject it to avoid it searching
	if (process.execPath.endsWith('/node') || process.execPath.endsWith('/node.exe')) {
		customArgs.push('-DNODE_EXECUTABLE=' + process.execPath)
	}

	// TODO - more here

	await runCommand([cmakePath, pathToSourceFromOut, ...customArgs, ...args._.slice(1)], {
		cwd: args.out,
		silent: args.silent,
	})
}

async function assertBuildDirExists(args: ArgumentsCamelCase<BaseArgs>) {
	try {
		const s = await fs.stat(args.out)
		if (!s.isDirectory()) throw new Error('Not a directory')
	} catch (e) {
		console.error('Output directory does not exist. Please run `cmake-js configure` first.')
		process.exit(1)
	}
}

interface CmakeBuildArgs extends BaseArgs {
	// source?: string
}

async function cmakeBuild(args: ArgumentsCamelCase<CmakeBuildArgs>) {
	const cmakePath = await findCmake()

	await assertBuildDirExists(args)

	const customArgs: string[] = []

	if (process.platform === 'win32' && !args._.includes('--config')) {
		// Default to release config unless specified
		customArgs.push('--config', 'Release')
	}

	// TODO - stuff here?

	await runCommand([cmakePath, '--build', '.', ...customArgs, ...args._.slice(1)], {
		cwd: args.out,
		silent: args.silent,
	})
}

interface CmakeCleanArgs extends BaseArgs {
	// source?: string
}

async function cmakeClean(args: ArgumentsCamelCase<CmakeCleanArgs>) {
	const cmakePath = await findCmake()

	await assertBuildDirExists(args)

	const customArgs: string[] = []

	// TODO - stuff here?

	await runCommand([cmakePath, '--build', '.', '--target', 'clean', ...customArgs, ...args._.slice(1)], {
		cwd: args.out,
		silent: args.silent,
	})
}

// async function runListGenerators(buildSystem, args) {
// 	const generators = await buildSystem.getGenerators()

// 	console.log('Available generators:')
// 	console.log(generators.map((g) => ' - ' + g).join('\n'))
// }

// async function runSelectGenerators(buildSystem, args) {
// 	const bestGenerator = await buildSystem.selectGeneratorAndPlatform(args)

// 	if (!bestGenerator) {
// 		console.error('No suitable generator found')
// 		process.exit(1)
// 	} else {
// 		console.log(bestGenerator.generator + (bestGenerator.platform ? ' ' + bestGenerator.platform : ''))
// 	}
// }

// const rawArgv: string[] = hideBin(process.argv)
// if (rawArgv[0].endsWith('cmake-js-bin.mts')) rawArgv.shift()
// console.log(rawArgv)

const args = await yargs(hideBin(process.argv))
	// .parserConfiguration({ // TODO - this would be nice to have
	// 	'unknown-options-as-args': true,
	// })
	.usage('CMake.js ' + packageJson.version + '\n\nUsage: $0 [<command>] [options]')
	.version(false)
	.command(
		'configure',
		'Invoke cmake with the given arguments',
		{
			source: {
				// alias: 'd',
				describe: 'Specify the source directory to compile, default is the current directory',
				type: 'string',
			},
		},
		wrapCMakeCommand(cmakeConfigure),
	)
	.command('build', 'Invoke `cmake --build` with the given arguments', {}, wrapCMakeCommand(cmakeBuild))
	.command('clean', 'Clean the project directory', {}, wrapCMakeCommand(cmakeClean))
	// .command('list-generators', 'List available generators', {}, wrapCommand(runListGenerators))
	// .command('select-generator', 'Select the best available generators', {}, wrapCommand(runSelectGenerators))
	.demandCommand()
	.options({
		// // 		l: {
		// // 			alias: 'log-level',
		// // 			demand: false,
		// // 			describe: 'set log level (' + logLevels.join(', ') + '), default is info',
		// // 			type: 'string',
		// // 		},
		// config: {
		// 	// alias: 'B',
		// 	demand: false,
		// 	describe: "specify build configuration (Debug, RelWithDebInfo, Release), will ignore '--debug' if specified",
		// 	type: 'string',
		// },
		// generator: {
		// 	// alias: 'G',
		// 	demand: false,
		// 	describe: 'use specified generator',
		// 	type: 'string',
		// },
		// // 		A: {
		// // 			alias: 'platform',
		// // 			demand: false,
		// // 			describe: 'use specified platform name',
		// // 			type: 'string',
		// // 		},
		// target: {
		// 	// alias: 'T',
		// 	demand: false,
		// 	describe: 'only build the specified target',
		// 	type: 'string',
		silent: {
			// alias: 'silent',
			describe: 'Silence CMake output',
			type: 'boolean',
			default: false,
		},
		out: {
			alias: 'o',
			describe: 'Specify the output directory to compile to, default is projectRoot/build',
			type: 'string',
			default: 'build',
		},
	})
	.help()
	.parseAsync()
