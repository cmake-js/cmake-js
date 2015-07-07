"use strict";
var exec = require('child_process').exec;
var Bluebird = require("bluebird");
var _ = require("lodash");
var environment = require("./environment");

var vsDetect = {
    isInstalled: function (version) {
        // On x64 this will look for x64 keys only, but if VS and compilers installed properly,
        // it will write it's keys to 64 bit registry as well.
        var command = "reg query \"HKLM\\Software\\Microsoft\\VisualStudio\\" + version + "\"";
        return new Bluebird(function (resolve, reject) {
            exec(command, function(err, stdout, stderr) {
                _.noop(err);
                if (stdout) {
                    var lines = stdout.split("\r\n").filter(function(line) { return line.length > 10; });
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
