"use strict";
let Bluebird = require("bluebird");
let splitargs = require("splitargs");
let _ = require("lodash");
let spawn = require("child_process").spawn;
let exec = require("child_process").exec;

let processHelpers = {
    run: function (command, options) {
        options = _.defaults(options, {silent: false});
        return new Bluebird(function (resolve, reject) {
            let args = splitargs(command);
            let name = args[0];
            args.splice(0, 1);
            let child = spawn(name, args, {stdio: options.silent ? "ignore" : "inherit"});
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
    exec: function(command) {
        return new Bluebird(function (resolve, reject) {
            exec(command, function (err, stdout, stderr) {
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
