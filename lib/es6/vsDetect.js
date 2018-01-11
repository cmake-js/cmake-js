"use strict";
let processHelpers = require("./processHelpers");
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let _ = require("lodash");

let vsDetect = {
    isInstalled: async(function* (version) {
        return (yield this._isVSInstalled(version)) ||
            (yield this._isVSvNextInstalled(version)) ||
            (yield this._isBuildToolsInstalled(version));
    }),
    _isBuildToolsInstalled: async(function*(version) {
        let mainVer = version.split(".")[0];
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
        let command = "reg query \"" + key + "\"";
        try {
            let stdout = yield processHelpers.exec(command);
            return stdout && stdout.indexOf(testPhrase) > 0;
        }
        catch (e) {
            _.noop(e);
        }
        return false;
    }),
    _isVSInstalled: async(function*(version) {
        // On x64 this will look for x64 keys only, but if VS and compilers installed properly,
        // it will write it's keys to 64 bit registry as well.
        let command = "reg query \"HKLM\\Software\\Microsoft\\VisualStudio\\" + version + "\"";
        try {
            let stdout = yield processHelpers.exec(command);
            if (stdout) {
                let lines = stdout.split("\r\n").filter(function (line) {
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
    }),
    _isVSvNextInstalled: async(function*(version) {
        let mainVer = version.split(".")[0];
        let command = "reg query \"HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VisualStudio.MinShell.Msi,v" + mainVer + "\"";
        try {
            let stdout = yield processHelpers.exec(command);
            if (stdout) {
                let lines = stdout.split("\r\n").filter(function (line) {
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
    })
};

module.exports = vsDetect;
