"use strict";
var environment = require("./environment");
var cli = require("cli");
var Bluebird = require("bluebird");
var _ = require("lodash");

var vsDetect = {
    isInstalled: function (version) {
        // On x64 this will look for x64 keys only, but if VS and compilers installed properly,
        // it will write it's keys to 64 bit registry as well.
        var command = "reg query \"HKLM\\Software\\Microsoft\\VisualStudio\\" + version + "\"";
        return new Bluebird(function (resolve, reject) {
            cli.exec(command,
                function (output) {
                    // Key exists, VS installed (we might hope)
                    resolve(true);
                },
                function (err, output) {
                    _.noop(err, output);
                    resolve(false);
                });
        });
    }
};

module.exports = vsDetect;
