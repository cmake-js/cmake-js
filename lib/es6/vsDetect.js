"use strict";
let processHelpers = require("./processHelpers");
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let _ = require("lodash");

let vsDetect = {
    isInstalled: async(function* (version) {
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
    })
}

module.exports = vsDetect;
