"use strict";
var cli = require("cli");
var which = require("which");
var fs = require("fs");
var Bluebird = require("bluebird");
var generatorFactory = require("./generatorFactory");

function CMake(options) {
    this.options = options || {};
    this._currentGenerator = null;
}

CMake.isAvailable = function (options) {
    options = options || {};
    try {
        if (options["cmake-path"]) {
            var stat = fs.lstatSync(options["cmake-path"]);
            return !stat.isDirectory();
        }
        else {
            which.sync("cmake");
            return true;
        }
    }
    catch (e) {
    }
    return false;
};

CMake.getPath = function (options) {
    options = options || {};
    return options["cmake-path"] || "cmake";
};

CMake.getGenerators = function (options) {
    options = options || {};
    return new Bluebird(function (resolve, reject) {
        var gens = [];
        if (CMake.isAvailable(options)) {
            cli.exec(CMake.getPath(options) + " --help",
                function (output) {
                    var on = false;
                    output.forEach(function (line, i) {
                        if (on) {
                            var parts = line.split("=");
                            if ((parts.length === 2 && parts[0].trim()) ||
                                (parts.length === 1 && i !== output.length - 1 && output[i + 1].trim()[0] === "=")) {
                                gens.push(parts[0].trim());
                            }
                        }
                        if (line.trim() === "Generators") {
                            on = true;
                        }
                    });
                    resolve(gens);
                },
                function (err, output) {
                    reject(new Error(err.message + "\n" + output));
                });
        }
        else {
            resolve(gens);
        }
    });
};

CMake.prototype.getCurrentGenerator = function () {
    var self = this;
    if (!self._currentGenerator) {
        return generatorFactory.create(self.options)
            .then(function (gen) {
                self._currentGenerator = gen;
                return gen;
            });
    }
    else {
        return Bluebird.resolve(self._currentGenerator);
    }
};

module.exports = CMake;