"use strict";
var cli = require("cli");
var which = require("which");
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var path = require("path");
var log = require('npmlog');
var _ = require("lodash");
var environment = require("./environment");
var dist = require("./dist");

function CMake (options) {
    this.options = options || {};
    this.projectRoot = this.options.directory || process.cwd();
    this.workDir = path.join(this.projectRoot, "build");
    this.config = this.options.debug ? "Debug" : "Release";
    this.buildDir = path.join(this.workDir, this.config);
    this._isAvailable = null;
}

Object.defineProperties(CMake.prototype, {
    path: {
        get: function () {
            return this.options["cmake-path"] || "cmake";
        }
    },
    isAvailable: {
        get: function () {
            if (this._isAvailable === null) {
                this._isAvailable = CMake.isAvailable(this.options);
            }
            return this._isAvailable;
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

CMake.getGenerators = function (options) {
    options = options || {};
    return new Bluebird(function (resolve, reject) {
        var gens = [];
        if (CMake.isAvailable(options)) {
            cli.exec((options["cmake-path"] || "cmake") + " --help",
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

CMake.prototype.getGenerators = function () {
    return CMake.getGenerators(this.options);
};

CMake.prototype.verifyIfAvailable = function () {
    if (!this.isAvailable) {
        throw new Error("CMake is not found.");
    }
};

CMake.prototype.configure = function () {
    this.verifyIfAvailable();

    var self = this;
    var vsGeneratorOverride;
    var init;
    if (environment.isWin && environment.isX64) {
        init = this.getGenerators()
            .then(function (list) {
                var maxVer = 0;
                list.forEach(function (gen) {
                    var found = /^visual studio (\d+)/i.exec(gen);
                    if (found) {
                        var ver = parseInt(found[1]);
                        if (ver > maxVer) {
                            vsGeneratorOverride = "-G\"" + gen + " Win64\"";
                            maxVer = ver;
                        }
                    }
                });
            });
    }
    else {
        init = Bluebird.resolve();
    }

    return init.then(function () {
        var useNinja = environment.isLinux && !self.options["prefer-make"] && environment.isNinjaAvailable;
        var command = self.path;
        command += " " + self.projectRoot;
        if (useNinja) {
            command += " -GNinja";
        }
        else if (vsGeneratorOverride) {
            command += " " + vsGeneratorOverride;
        }
        var D = [];
        D.push({ "CMAKE_LIBRARY_OUTPUT_DIRECTORY": self.buildDir });
        if (!environment.isWin) {
            // If we have Make
            D.push({ "CMAKE_BUILD_TYPE": self.config });
        }

        var nodeH = path.join(dist.internalPath, "/src");
        var v8H = path.join(dist.internalPath, "/deps/v8/include");
        var incPaths = [nodeH, v8H];

        D.push({ "CMAKE_JS_INC": incPaths.join(";") });
        if (environment.isWin) {
            D.push({ "CMAKE_JS_LIB": dist.winLibPath });
        }

        command += " " +
        D.map(function (p) {
            return "-D" + _.keys(p)[0] + "=\"" + _.values(p)[0] + "\"";
        }).join(" ");

        try {
            fs.mkdirSync(self.workDir);
        }
        catch (e) {
        }

        var cwd = process.cwd();
        process.chdir(self.workDir);

        return self._run(command).finally(function () {
            process.chdir(cwd);
        });
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
    this.verifyIfAvailable();
    var self = this;
    return self.ensureConfigured()
        .then(function () {
            return self._run(self.path + " --build " + self.workDir + " --config " + self.config)
                .then(function() {
                    return self.renameToNode(true);
                });
        });
};

CMake.prototype.clean = function () {
    return fs.deleteAsync(this.workDir);
};

CMake.prototype.rebuild = function () {
    var self = this;
    return self.clean()
        .then(function () {
            return self.build();
        });
};

CMake.prototype.renameToNode = function(deleteOld) {
    var self = this;
    return fs.readdirAsync(this.buildDir)
        .then(function(files) {
            var next;
            files.filter(function(f) {
                var result = /^(?:lib)?(.*)(?:(?:\.so)|(?:\.dynlib)|(?:\.dll))/.exec(f);
                if (_.isArray(result)) {
                    var fn = result[0];
                    var newFn = result[1] + ".node";
                    if (deleteOld) {
                        next = fs.renameAsync(path.join(self.buildDir, fn), path.join(self.buildDir, newFn));
                    }
                    else {
                        next = fs.copyAsync(path.join(self.buildDir, fn), path.join(self.buildDir, newFn));
                    }
                    return false;
                }
            });
            return next;
    });
};

CMake.prototype._run = function (command) {
    log.info("RUN", command);
    return new Bluebird(function (resolve, reject) {
        cli.exec(command,
            function (output) {
                output.forEach(function (line) {
                    log.info("", line);
                });
                resolve();
            },
            function (err, output) {
                if (output) {
                    output = output.replace(/\r\n/, "");
                }
                if (err instanceof Error) {
                    reject(new Error(err.message + (output ? ("\n" + output) : "")));
                }
                else {
                    // err is a warning string
                    output.split("\n").forEach(function (line) {
                        log.info("", line.trim());
                    });
                    log.warn("", err);
                    resolve();
                }
            });
    });
};

module.exports = CMake;