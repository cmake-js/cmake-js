"use strict";
var cli = require("cli");
var which = require("which");
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs"));
var path = require("path");
var rimraf = Bluebird.promisify(require("rimraf"));
var configureLogic = require("./configureLogic");
var buildLogic = require("./buildLogic");

function CMake (options) {
    this.options = options || {};
    this.projectRoot = this.options.directory || process.cwd();
    this.workDir = path.join(this.projectRoot, "build");
    this.buildType = this.options.debug ? "Debug" : "Release";
    this.buildDir = path.join(this.workDir, this.buildType);
    this._isAvailable = null;
}

Object.defineProperties(CMake.prototype, {
    path: {
        get: function() {
            return this.options["cmake-path"] || "cmake";
        }
    }
});

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

CMake.prototype.isAvailable = function() {
    var self = this;
    if (self._isAvailable === null) {
        return CMake.isAvailable(self.options)
            .then(function(avail) {
                self._isAvailable = avail;
                return avail;
            });
    }
    else {
        return Bluebird.resolve(self._isAvailable);
    }
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

CMake.prototype.getGenerators = function() {
    return CMake.getGenerators(this.options);
};

CMake.prototype.verifyIfAvailable = function () {
    return this.isAvailable()
        .then(function (avail) {
            if (!avail) {
                throw new Error("CMake is not found.");
            }
        });
};

CMake.prototype.configure = function () {
    var self = this;
    return self.verifyIfAvailable()
        .then(function () {
            return configureLogic.do(self);
        });
};

CMake.prototype.ensureConfigured = function () {
    var self = this;
    return fs.lstatAsync(path.join(self.workDir, "CMakeCache.txt"))
        .then(_.noop,
        function () {
            // Not found:
            return self.configure();
        });
};

CMake.prototype.build = function () {
    var self = this;
    return self.verifyIfAvailable()
        .then(function () {
            return buildLogic.do(self);
        });
};

CMake.prototype.clean = function () {
    return rimraf(this.workDir);
};

CMake.prototype.rebuild = function () {
    var self = this;
    self.clean()
        .then(function () {
            return self.build();
        });
};

module.exports = CMake;