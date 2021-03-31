"use strict";
const processHelpers = require("./processHelpers");
const _ = require("lodash");
const path = require("path");

const vsDetect = {
    isInstalled: async function (version) {
        const vsInstalled = await this._isVSInstalled(version);
        const vsvNextInstalled = await this._isVSvNextInstalled(version);
        const buildToolsInstalled = await this._isBuildToolsInstalled(version);
        const foundByVSWhere = await this._isFoundByVSWhere(version);

        return vsInstalled || vsvNextInstalled || buildToolsInstalled || foundByVSWhere;
    },

    _isFoundByVSWhere: async function (version) {
        // TODO: with auto download
        /*
        let mainVer = version.split(".")[0];
        let command = path.resolve("vswhere.exe");
        try {
            let stdout = yield processHelpers.execFile([command, "-version", version]);
            return stdout && stdout.indexOf("installationVersion: " + mainVer) > 0;
        }
        catch (e) {
            _.noop(e);
        }
        */
        return false;
    },

    _isBuildToolsInstalled: async function (version) {
        const mainVer = version.split(".")[0];
        let key;
        let testPhrase;
        if (Number(mainVer) >= 15) {
            key = "HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VS.windows_toolscore,v" + mainVer;
            testPhrase = "Version";
        }
        else {
            key = "HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VS.VisualCppBuildTools_x86_enu,v" + mainVer;
            testPhrase = "Visual C++";
        }
        const command = ["reg", "query", "\"" + key + "\""];
        try {
            const stdout = await processHelpers.execFile(command);
            return stdout && stdout.indexOf(testPhrase) > 0;
        }
        catch (e) {
            _.noop(e);
        }
        return false;
    },

    _isVSInstalled: async function (version) {
        // On x64 this will look for x64 keys only, but if VS and compilers installed properly,
        // it will write it's keys to 64 bit registry as well.
        const command = ["reg", "query", "\"HKLM\\Software\\Microsoft\\VisualStudio\\" + version + "\""];
        try {
            const stdout = await processHelpers.execFile(command);
            if (stdout) {
                const lines = stdout.split("\r\n").filter(function (line) {
                    return line.length > 10;
                });
                if (lines.length >= 4) {
                    return true;
                }
            }
        }
        catch (e) {
            _.noop(e);
        }
        return false;
    },

    _isVSvNextInstalled: async function (version) {
        const mainVer = version.split(".")[0];
        const command = ["reg", "query", "\"HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VisualStudio.MinShell.Msi,v" + mainVer + "\""];
        try {
            const stdout = await processHelpers.execFile(command);
            if (stdout) {
                const lines = stdout.split("\r\n").filter(function (line) {
                    return line.length > 10;
                });
                if (lines.length >= 3) {
                    return true;
                }
            }
        }
        catch (e) {
            _.noop(e);
        }
        return false;
    }
};

module.exports = vsDetect;
