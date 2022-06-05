"use strict";
const path = require("path");
const fs = require('fs/promises')
const headers = require('node-api-headers');
const processHelpers = require("./processHelpers");

function sanitiseArch(arch) {
    if (arch === 'ia32') return 'x86'
    return arch
}

async function generateNodeLib (options, vsInfo, targetFile) {
    try {
        const vsToolsVersion = (await fs.readFile(path.join(vsInfo.path, 'VC\\Auxiliary\\Build\\Microsoft.VCToolsVersion.default.txt'))).toString().trim()
        
        // This will probably not work for non x86/x64 builds, but that is a rarity for windows
        const runtimeArch = sanitiseArch(options.arch)
        const libExePath = path.join(vsInfo.path, 'VC\\Tools\\MSVC', vsToolsVersion, `bin\\Host${sanitiseArch(process.arch)}`, runtimeArch, 'lib.exe')
        const stat = await fs.stat(libExePath)
        if (!stat.isFile()) return null

        // Compile a Set of all the symbols that could be exported
        const allSymbols = new Set()
        for (const ver of Object.values(headers.symbols)) {
            for (const sym of ver.node_api_symbols) {
                allSymbols.add(sym)
            }
        }

        const parentDir = path.dirname(targetFile)
        await fs.mkdir(parentDir, { recursive: true })

        const allSymbolsArr = Array.from(allSymbols)
        const targetFileDef = `${targetFile}.def`
        await fs.writeFile(targetFileDef, 'NAME NODE.EXE\nEXPORTS\n' + allSymbolsArr.join('\n'))

        await processHelpers.run([
            libExePath,
            `/def:${targetFileDef}`,
            `/out:${targetFile}`,
            `/machine:${runtimeArch}`
        ], { silent: true })

        // Cleanup
        await fs.unlink(targetFileDef)

        return targetFile
    } catch(e) {
        console.error(e)
        // It most likely wasn't found
        throw new Error(`Failed to generate node.lib`)
    }
}

async function locateNodeApi (projectRoot) {
    if (locateNodeApi.__projectRoot) {
        // Override for unit tests
        projectRoot = locateNodeApi.__projectRoot;
    }

    try {
        const tmpRequire = require('module').createRequire(path.join(projectRoot, 'package.json'))
        const inc = tmpRequire('node-addon-api')
        return inc.include.replace(/"/g, '')
    } catch (e) {
        // It most likely wasn't found
        return null;
    }
};

module.exports = {
    generateNodeLib,
    locateNodeApi
}
