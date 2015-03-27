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

var binaryDirRex = new RegExp("^(.*)_BINARY_DIR\:STATIC=(.*)");

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

CMake.prototype.getConfigureCommand = function() {
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

        // Output path:
        D.push({ "CMAKE_LIBRARY_OUTPUT_DIRECTORY": self.buildDir });

        // Build configuration:
        if (!environment.isWin) {
            // If we have Make
            D.push({ "CMAKE_BUILD_TYPE": self.config });
        }

        // Include and lib:
        var nodeH = path.join(dist.internalPath, "/src");
        var v8H = path.join(dist.internalPath, "/deps/v8/include");
        var incPaths = [nodeH, v8H];

        D.push({ "CMAKE_JS_INC": incPaths.join(";") });
        if (environment.isWin) {
            D.push({ "CMAKE_JS_LIB": dist.winLibPath });
        }

        // Prefer Clang
        var useClang = !environment.isWin && !self.options["prefer-gcc"] && environment.isClangAvailable;
        if (useClang) {
            D.push({ "CMAKE_C_COMPILER": "clang" });
            D.push({ "CMAKE_CXX_COMPILER": "clang++" });
        }

        command += " " +
        D.map(function (p) {
            return "-D" + _.keys(p)[0] + "=\"" + _.values(p)[0] + "\"";
        }).join(" ");

        return command;
    });
};

CMake.prototype.configure = function () {
    this.verifyIfAvailable();

    var self = this;
    return self.getConfigureCommand()
        .then(function(command) {
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

CMake.prototype._getConfiguredProjectName = function() {
    var self = this;
    return fs.readFileAsync(path.join(self.workDir, "CMakeCache.txt"), {encoding: "utf8"})
        .then(function(lines) {
            var projectName;
            lines.split(environment.EOL)
                .forEach(function(line) {
                    var found = binaryDirRex.exec(line);
                    if (found && found[2] === self.workDir) {
                        projectName = found[1];
                        return false;
                    }
                });
            if (!projectName) {
                throw new Error("Project is not properly configured, project name hasn't been found in CMakeCache.txt.");
            }
            return projectName;
        },
        function(e) {
            throw new Error("Project is not configured, CMakeCache.txt doesn't exists.");
        });
};

CMake.prototype.getBuildLibraryCommand = function() {
    return this.path + " --build " + this.workDir + " --config " + this.config;
};

CMake.prototype.getRenameToPluginCommand = function() {
    var self = this;
    return self._getConfiguredProjectName()
        .then(function(projectName) {
            var resultLibraryExt = ".so";
            if (environment.isWin) {
                resultLibraryExt = ".dll";
            }
            else if (environment.isOSX) {
                resultLibraryExt = ".dynlib";
            }
            var resultLibraryPrefix = environment.isWin ? "" : "lib";
            var resultLibraryName = resultLibraryPrefix + projectName + resultLibraryExt;
            var resultLibraryPath = path.join(self.buildDir, resultLibraryName);
            var resultPluginName = projectName + ".node";
            var resultPluginPath = path.join(self.buildDir, resultPluginName);
            return self.path + " -E rename " + resultLibraryPath + " " + resultPluginPath;
        });
};

CMake.prototype.getBuildCommand = function() {
    var self = this;
    return self.getRenameToPluginCommand()
        .then(function(renameToPluginCommand) {
            return self.getBuildLibraryCommand() + " && " + renameToPluginCommand;
        });
};

CMake.prototype.build = function () {
    this.verifyIfAvailable();
    var self = this;
    return self.ensureConfigured()
        .then(function () {
            return self.getBuildCommand();
        })
        .then(function(buildCommand) {
            return self._run(buildCommand);
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

CMake.prototype._run = function (command) {
    log.info("RUN", command);
    return new Bluebird(function (resolve, reject) {
        cli.exec(command,
            function (output) {
                output.forEach(function (line) {
                    log.info("OUT", line);
                });
                resolve();
            },
            function (err, output) {
                if (err instanceof Error) {
                    reject(new Error(err.message + (output ? ("\n" + output) : "")));
                }
                else {
                    // err is a warning string
                    output.split("\n").forEach(function (line) {
                        log.info("OUT", line.trim());
                    });
                    log.info("OUT", err);
                    resolve();
                }
            });
    });
};

module.exports = CMake;