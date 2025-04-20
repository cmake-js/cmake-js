import yargs, { ArgumentsCamelCase, Options as YargsOptions } from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'node:fs/promises'
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
	dest: string
	silent: boolean
}

interface CmakeConfigureArgs extends BaseArgs {
	source?: string

	runtime?: string
	runtimeVersion?: string
	runtimeArch?: string
}

async function cmakeConfigure(args: ArgumentsCamelCase<CmakeConfigureArgs>) {
	const cmakePath = await findCmake()

	await fs.mkdir(args.dest, { recursive: true })

	const customArgs: string[] = []

	if (!args._.includes('-B')) customArgs.push('-B', args.dest)

	// If we know the executable path for certain, we can inject it to avoid it searching
	if (process.execPath.endsWith('/node') || process.execPath.endsWith('/node.exe')) {
		customArgs.push('-DNODE_EXECUTABLE=' + process.execPath)
	}

	if (args.runtime) {
		customArgs.push(`-DCMAKEJS_TARGET_RUNTIME=${args.runtime}`)
		if (args.runtimeVersion) {
			customArgs.push(`-DCMAKEJS_TARGET_RUNTIME_VERSION=${args.runtimeVersion}`)
		} else {
			throw new Error('--runtimeVersion must be specified when --runtime is provided')
		}
		if (args.runtimeArch) {
			customArgs.push(`-DCMAKEJS_TARGET_RUNTIME_ARCH=${args.runtimeArch}`)
		}
	}

	await runCommand([cmakePath, ...customArgs, ...args._.slice(1)], {
		silent: args.silent,
	})
}

async function assertBuildDirExists(args: ArgumentsCamelCase<BaseArgs>) {
	try {
		const s = await fs.stat(args.dest)
		if (!s.isDirectory()) throw new Error('Not a directory')
	} catch (e) {
		console.error('Output directory does not exist. Please run `cmake-js configure` first.')
		process.exit(1)
	}
}

async function cmakeAutoBuild(args: ArgumentsCamelCase<CmakeConfigureArgs>) {
	await cmakeConfigure(args)
	await cmakeBuild({
		// Strip the args, as build and configure need different things, and we can't cater to both
		dest: args.dest,
		silent: args.silent,

		_: [],
		$0: args.$0,
	} satisfies ArgumentsCamelCase<BaseArgs>)
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

	if (!args._.includes('--parallel')) customArgs.push('--parallel')

	await runCommand([cmakePath, '--build', args.dest, ...customArgs, ...args._.slice(1)], {
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

	await runCommand([cmakePath, '--build', args.dest, '--target', 'clean', ...customArgs, ...args._.slice(1)], {
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

const configureOptions = {
	source: {
		alias: 'S',
		describe: 'Specify the source directory to compile, default is the current directory',
		type: 'string',
	} satisfies YargsOptions,
	runtime: {
		describe: 'Specify the runtime to build for. Default is node',
		type: 'string',
	} satisfies YargsOptions,
	runtimeVersion: {
		describe:
			'Specify the runtime version to build for. Default is the current version. This must be specified if the runtime is specified',
		type: 'string',
	} satisfies YargsOptions,
	runtimeArch: {
		describe: 'Specify the runtime architecture to build for. Default is the current architecture',
		type: 'string',
	} satisfies YargsOptions,
}

await yargs(hideBin(process.argv))
	.usage('CMake.js ' + packageJson.version + '\n\nUsage: $0 [<command>] [options]')
	.version(false)
	.command(
		'autobuild',
		'Invoke cmake with the given arguments to configure the project, then perform an automatic build\nYou can add any custom cmake args after `--`',
		{
			...configureOptions,
		},
		wrapCMakeCommand(cmakeAutoBuild),
	)
	.command(
		'configure',
		'Invoke cmake with the given arguments\nYou can add any custom cmake args after `--`',
		{
			...configureOptions,
		},
		wrapCMakeCommand(cmakeConfigure),
	)
	.command(
		'build',
		'Invoke `cmake --build` with the given arguments\nYou can add any custom cmake args after `--`',
		{},
		wrapCMakeCommand(cmakeBuild),
	)
	.command('clean', 'Clean the project directory', {}, wrapCMakeCommand(cmakeClean))
	.demandCommand(1)
	.strict()
	.options({
		silent: {
			// alias: 'silent',
			describe: 'Silence CMake output',
			type: 'boolean',
			default: false,
		},
		dest: {
			alias: 'B',
			describe: 'Specify the directory to write build output to, default is build',
			type: 'string',
			default: 'build',
		},
	})
	.help()
	.parseAsync()
