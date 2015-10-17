"use strict";
let exec = require('child_process').exec;
let Bluebird = require("bluebird");
let _ = require("lodash");
let environment = require("./environment");

let vsDetect = {
    isInstalled: function (version) {
        // On x64 this will look for x64 keys only, but if VS and compilers installed properly,
        // it will write it's keys to 64 bit registry as well.
        let command = "reg query \"HKLM\\Software\\Microsoft\\VisualStudio\\" + version + "\"";
        return new Bluebird(function (resolve, reject) {
            exec(command, function(err, stdout, stderr) {
                _.noop(err);
                if (stdout) {
                    let lines = stdout.split("\r\n").filter(function(line) { return line.length > 10; });
                    if (lines.length >= 4) {
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                }
                else {
                    resolve(false);
                }
            });
        });
    }
};

module.exports = vsDetect;
