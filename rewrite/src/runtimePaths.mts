'use strict'
import semver from 'semver'

const NODE_MIRROR = process.env.NVM_NODEJS_ORG_MIRROR || 'https://nodejs.org/dist'
const ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://artifacts.electronjs.org/headers/dist'
const NWJS_MIRROR = process.env.NWJS_MIRROR || 'https://node-webkit.s3.amazonaws.com'

export interface TargetOptions {
	runtime: string
	runtimeVersion: string
	runtimeArch: string
}

interface WinLib {
	dir: string
	name: string
}

export interface RuntimePathsInfo {
	externalPath: string
	winLibs: WinLib[]
	tarPath: string
	headerOnly: boolean
}

const RuntimePaths: Record<string, (targetOptions: TargetOptions) => RuntimePathsInfo> = {
	node: function (targetOptions: TargetOptions): RuntimePathsInfo {
		if (semver.lt(targetOptions.runtimeVersion, '4.0.0')) {
			return {
				externalPath: `${NODE_MIRROR}/v${targetOptions.runtimeVersion}/`,
				winLibs: [
					{
						dir: targetOptions.runtimeArch,
						name: 'node.lib',
					},
				],
				tarPath: `node-v${targetOptions.runtimeVersion}.tar.gz`,
				headerOnly: false,
			}
		} else {
			return {
				externalPath: `${NODE_MIRROR}/v${targetOptions.runtimeVersion}/`,
				winLibs: [
					{
						dir: `win-${targetOptions.runtimeArch}`,
						name: 'node.lib',
					},
				],
				tarPath: `node-v${targetOptions.runtimeVersion}-headers.tar.gz`,
				headerOnly: true,
			}
		}
	},
	nw: function (targetOptions: TargetOptions): RuntimePathsInfo {
		if (semver.gte(targetOptions.runtimeVersion, '0.13.0')) {
			return {
				externalPath: `${NWJS_MIRROR}/v${targetOptions.runtimeVersion}/`,
				winLibs: [
					{
						dir: targetOptions.runtimeArch,
						name: 'nw.lib',
					},
					{
						dir: targetOptions.runtimeArch,
						name: 'node.lib',
					},
				],
				tarPath: `nw-headers-v${targetOptions.runtimeVersion}.tar.gz`,
				headerOnly: false,
			}
		}
		return {
			externalPath: `https://node-webkit.s3.amazonaws.com/v${targetOptions.runtimeVersion}/`,
			winLibs: [
				{
					dir: targetOptions.runtimeArch,
					name: 'nw.lib',
				},
			],
			tarPath: `nw-headers-v${targetOptions.runtimeVersion}.tar.gz`,
			headerOnly: false,
		}
	},
	electron: function (targetOptions: TargetOptions): RuntimePathsInfo {
		return {
			externalPath: `${ELECTRON_MIRROR}/v${targetOptions.runtimeVersion}/`,
			winLibs: [
				{
					dir: targetOptions.runtimeArch,
					name: 'node.lib',
				},
			],
			tarPath: `node-v${targetOptions.runtimeVersion}.tar.gz`,
			headerOnly: semver.gte(targetOptions.runtimeVersion, '4.0.0-alpha'),
		}
	},
}

export default RuntimePaths
