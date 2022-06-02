const fs = require('fs')
const path = require('path')
const os = require('os')
const { getPrebuildName, isNwjs, isElectron, isAlpine } = require('./lib/prebuild')

// Workaround to fix webpack's build warnings: 'the request of a dependency is an expression'
const runtimeRequire = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require // eslint-disable-line

/**
 * Find the best path to the binding file
 * @param {string} basePath - Base path of the module, where binaries will be located
 * @param {object} options - Describe how the prebuilt binary is named
 * @param {boolean} verifyPrebuild - True if we are verifying that a prebuild exists
 * @returns 
 */
function resolvePath(basePath, options, verifyPrebuild) {
    if (typeof basePath !== 'string' || !basePath) throw new Error(`Invalid basePath to cmake-js/bindings`)

    if (typeof options !== 'object' || !options) throw new Error(`Invalid options to cmake-js/bindings`)
    if (typeof options.name !== 'string' || !options.name) throw new Error(`Invalid name to cmake-js/bindings`)
    
    let isNodeApi = false
    if (options.napi_versions && Array.isArray(options.napi_versions)) {
        isNodeApi = true
    }

    const arch = (verifyPrebuild && process.env.npm_config_arch) || os.arch()
    const platform = (verifyPrebuild && process.env.npm_config_platform) || os.platform()
    
    let runtime = 'node'
    if (verifyPrebuild && process.env.npm_config_runtime) {
        runtime = process.env.npm_config_runtime
    } else if (isElectron()) {
        runtime = 'electron'
    } else if (isNwjs()) {
        runtime = 'node-webkit'
    }
    if (runtime === 'electron' && isNodeApi) runtime = 'node'

    const candidates = []
    
    if (!verifyPrebuild) {
        // Try for a locally built binding
        candidates.push(
            path.join(basePath, 'build', 'Debug', `${options.name}.node`),
            path.join(basePath, 'build', 'Release', `${options.name}.node`),
        )
    }

    let libc = undefined
    if (isAlpine(platform)) libc = 'musl'

    // Look for prebuilds
    if (isNodeApi) {
        // Look for node-api versioned builds
        for (const ver of options.napi_versions) {
            const prebuildName = getPrebuildName({
                name: options.name,
                platform,
                arch,
                libc,
                napi_version: ver,
                runtime,
                // armv: options.armv ? (arch === 'arm64' ? '8' : vars.arm_version) : null,
            })
            candidates.push(path.join(basePath, 'prebuilds', prebuildName))
        }
    } else {
        throw new Error('Not implemented for NAN!')
    }


    let foundPath = null

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            const stat = fs.statSync(candidate)
            if (stat.isFile()) {
                foundPath = candidate
                break
            }
        }
    }

    return foundPath
}

function loadBinding (basePath, options) {
    const foundPath = resolvePath(basePath, options)

    if (!foundPath) throw new Error(`Failed to find binding for ${options.name}`)

    return runtimeRequire(foundPath)
}
loadBinding.resolve = resolvePath 

module.exports = loadBinding