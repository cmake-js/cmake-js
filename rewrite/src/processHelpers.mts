import { spawn, execFile as execFileRaw } from 'node:child_process'

export async function runCommand(
	command: Array<string | number>,
	options?: { silent?: boolean; cwd?: string; env?: Record<string, string> },
): Promise<void> {
	return new Promise<void>(function (resolve, reject) {
		if (!options) options = {}

		const env = Object.assign({}, process.env, options.env)
		if (env.Path && env.PATH) {
			if (env.Path !== env.PATH) {
				env.PATH = env.Path + ';' + env.PATH
			}
			delete env.Path
		}

		const child = spawn(String(command[0]), command.slice(1) as string[], {
			stdio: options.silent ? 'ignore' : 'inherit',
			env,
			cwd: options.cwd,
			shell: true, // Because of windows
		})
		let ended = false
		child.on('error', function (e) {
			if (!ended) {
				reject(e)
				ended = true
			}
		})
		child.on('exit', function (code, signal) {
			if (!ended) {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error('Process terminated: ' + (code || signal)))
				}
				ended = true
			}
		})
	})
}

export async function execFile(command: string[], options?: { cwd?: string }): Promise<string> {
	return new Promise<string>(function (resolve, reject) {
		if (!options) options = {}

		execFileRaw(
			command[0],
			command.slice(1),
			{
				cwd: options.cwd,
			},
			function (err, stdout, stderr) {
				if (err) {
					reject(new Error(err.message + '\n' + (stdout || stderr)))
				} else {
					resolve(stdout)
				}
			},
		)
	})
}
