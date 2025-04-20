'use strict'

const cp = require('child_process')
const path = require('path')

const debug = require('debug')('cmake-js:find-visualstudio:registry')

const execFile = async (...args) =>
	new Promise((resolve) => {
		const child = cp.execFile(...args, (...a) => resolve(a))
		child.stdin.end()
	})

async function regGetValue(key, value, addOpts) {
	const outReValue = value.replace(/\W/g, '.')
	const outRe = new RegExp(`^\\s+${outReValue}\\s+REG_\\w+\\s+(\\S.*)$`, 'im')
	const reg = path.join(process.env.SystemRoot, 'System32', 'reg.exe')
	const regArgs = ['query', key, '/v', value].concat(addOpts)

	debug('running', reg, regArgs)
	const [err, stdout, stderr] = await execFile(reg, regArgs, { encoding: 'utf8' })

	debug('reg.exe stdout = %j', stdout)
	if (err || stderr.trim() !== '') {
		debug('reg.exe err = %j', err && (err.stack || err))
		debug('reg.exe stderr = %j', stderr)
		if (err) {
			throw err
		}
		throw new Error(stderr)
	}

	const result = outRe.exec(stdout)
	if (!result) {
		debug('error parsing stdout')
		throw new Error('Could not parse output of reg.exe')
	}

	debug('found: %j', result[1])
	return result[1]
}

async function regSearchKeys(keys, value, addOpts) {
	for (const key of keys) {
		try {
			return await regGetValue(key, value, addOpts)
		} catch {
			continue
		}
	}
}

module.exports = {
	regGetValue: regGetValue,
	regSearchKeys: regSearchKeys,
	execFile: execFile,
}
