"use strict";
var Bluebird = require("bluebird");
var splitargs = require("splitargs");
var _ = require("lodash");
var spawn = require("child_process").spawn;
var exec = require("child_process").exec;
var processHelpers = {
  run: function(command, options) {
    options = _.defaults(options, {silent: false});
    return new Bluebird(function(resolve, reject) {
      var args = splitargs(command);
      var name = args[0];
      args.splice(0, 1);
      var child = spawn(name, args, {stdio: options.silent ? "ignore" : "inherit"});
      var ended = false;
      child.on("error", function(e) {
        if (!ended) {
          reject(e);
          ended = true;
        }
      });
      child.on("exit", function(code, signal) {
        if (!ended) {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error("Process terminated: " + code || signal));
          }
          ended = true;
        }
      });
    });
  },
  exec: function(command) {
    return new Bluebird(function(resolve, reject) {
      exec(command, function(err, stdout, stderr) {
        if (err) {
          reject(new Error(err.message + "\n" + (stdout || stderr)));
        } else {
          resolve(stdout);
        }
      });
    });
  }
};
module.exports = processHelpers;

//# sourceMappingURL=processHelpers.js.map
