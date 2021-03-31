"use strict";
const Promise = require("bluebird");
const splitargs = require("splitargs");
const _ = require("lodash");
const spawn = require("child_process").spawn;
const execFile = require("child_process").execFile;

const processHelpers = {
    run: function (command, options) {
        options = _.defaults(options, {silent: false});
        return new Promise(function (resolve, reject) {
            const child = spawn(command[0], command.slice(1), {stdio: options.silent ? "ignore" : "inherit"});
            let ended = false;
            child.on("error", function (e) {
                if (!ended) {
                    reject(e);
                    ended = true;
                }
            });
            child.on("exit", function (code, signal) {
                if (!ended) {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error("Process terminated: " + code || signal));
                    }
                    ended = true;
                }
            });
        });
    },
    execFile: function(command) {
        return new Promise(function (resolve, reject) {
            execFile(command[0], command.slice(1), function (err, stdout, stderr) {
                if (err) {
                    reject(new Error(err.message + "\n" + (stdout || stderr)));
                }
                else {
                   resolve(stdout);
                }
            });
        });
    }
};

module.exports = processHelpers;
