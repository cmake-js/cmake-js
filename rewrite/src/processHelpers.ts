import { spawn, execFile as execFileRaw } from 'child_process'

export async function runCommand(command: string[], options?: { silent?: boolean }): Promise<void> {
	return new Promise<void>(function (resolve, reject) {
		if (!options) options = {}

		const env = Object.assign({}, process.env)
		if (env.Path && env.PATH) {
			if (env.Path !== env.PATH) {
				env.PATH = env.Path + ';' + env.PATH
			}
			delete env.Path
		}

		const child = spawn(command[0], command.slice(1), {
			stdio: options.silent ? 'ignore' : 'inherit',
			env,
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

export async function execFile(command: string[]): Promise<string> {
	return new Promise<string>(function (resolve, reject) {
		execFileRaw(command[0], command.slice(1), function (err, stdout, stderr) {
			if (err) {
				reject(new Error(err.message + '\n' + (stdout || stderr)))
			} else {
				resolve(stdout)
			}
		})
	})
}
