"use strict";
var cli = require("cli");
var which = require("which");
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var path = require("path");
var _ = require("lodash");
var environment = require("./environment");
var Dist = require("./dist");
var IntLog = require("./intLog");
var vsDetect = require("./vsDetect");

function CMake (options) {
    this.options = options || {};
    this.log = new IntLog(this.options);
    this.dist = new Dist(this.options);
    this.projectRoot = path.resolve(this.options.directory || process.cwd());
    this.workDir = path.join(this.projectRoot, "build");
    this.config = this.options.debug ? "Debug" : "Release";
    this.buildDir = path.join(this.workDir, this.config);
    this._isAvailable = null;
}

Object.defineProperties(CMake.prototype, {
    path: {
        get: function () {
            return this.options.cmakePath || "cmake";
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
        if (options.cmakePath) {
            var stat = fs.lstatSync(options.cmakePath);
            return !stat.isDirectory();
        }
        else {
            which.sync("cmake");
            return true;
        }
    }
    catch (e) {
        _.noop(e);
    }
    return false;
};

CMake.getGenerators = function (options) {
    options = options || {};
    return new Bluebird(function (resolve, reject) {
        var gens = [];
        if (CMake.isAvailable(options)) {
            cli.exec((options.cmakePath || "cmake") + " --help",
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
        throw new Error("CMake executable is not found. Please use your system's package manager to install it, or you can get installers from there: http://cmake.org.");
    }
};

CMake.prototype.getConfigureCommand = function () {
    var self = this;
    var vsGeneratorOverride;
    var init;
    if (environment.isWin && environment.isX64) {
        init = this.getGenerators()
            .then(function (list) {
                var tasks = [];
                var maxVer = 0;
                list.forEach(function (gen) {
                    var found = /^visual studio (\d+)/i.exec(gen);
                    if (found) {
                        var ver = parseInt(found[1]);
                        if (ver > maxVer) {
                            tasks.push(vsDetect.isInstalled(ver + ".0")
                                .then(function (installed) {
                                    if (installed && ver > maxVer) {
                                        vsGeneratorOverride = "-G\"" + gen + " Win64\"";
                                        maxVer = ver;
                                    }
                                }));
                        }
                    }
                });
                return Bluebird.all(tasks);
            });
    }
    else {
        init = Bluebird.resolve();
    }

    return init.then(function () {
        var useNinja = !environment.isWin && !self.options.preferMake && environment.isNinjaAvailable;
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
        var nodeH = path.join(self.dist.internalPath, "/src");
        var v8H = path.join(self.dist.internalPath, "/deps/v8/include");
        var uvH = path.join(self.dist.internalPath, "/deps/uv/include");
        var nanH = path.join(self.projectRoot, "/node_modules/nan");
        var incPaths = [nodeH, v8H, uvH];
        try {
            var stat = fs.statSync(nanH);
            if (stat.isDirectory()) {
                incPaths.push(nanH);
            }
        }
        catch (e) {
            _.noop(e);
        }

        D.push({ "CMAKE_JS_INC": incPaths.join(";") });
        if (environment.isWin) {
            D.push({ "CMAKE_JS_LIB": self.dist.winLibPath });
        }

        // Prefer Clang
        var useClang = !environment.isWin && !self.options.preferGnu && environment.isClangAvailable;
        if (useClang) {
            D.push({ "CMAKE_C_COMPILER": "clang" });
            D.push({ "CMAKE_CXX_COMPILER": "clang++" });
        }

        // Mac
        if (environment.isOSX) {
            D.push({"CMAKE_CXX_FLAGS": "-D_DARWIN_USE_64_BIT_INODE=1 -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64 -DBUILDING_NODE_EXTENSION"});
            D.push({"CMAKE_SHARED_LINKER_FLAGS": "-undefined dynamic_lookup"});
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

    this.log.info("CMD", "CONFIGURE");
    var self = this;
    var listPath = path.join(self.projectRoot, "CMakeLists.txt");
    return self.getConfigureCommand()
        .then(function (command) {
            return fs.lstatAsync(listPath)
                .then(function () {
                    return fs.mkdirAsync(self.workDir)
                        .catch(_.noop)
                        .finally(function () {
                            var cwd = process.cwd();
                            process.chdir(self.workDir);

                            return self._run(command).finally(function () {
                                process.chdir(cwd);
                            });
                        });
                },
                function (e) {
                    throw new Error("'" + listPath + "' not found.");
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

CMake.prototype.getBuildCommand = function () {
    return Bluebird.resolve(this.path + " --build \"" + this.workDir + "\" --config " + this.config);
};

CMake.prototype.build = function () {
    this.verifyIfAvailable();

    var self = this;
    return self.ensureConfigured()
        .then(function () {
            return self.getBuildCommand();
        })
        .then(function (buildCommand) {
            self.log.info("CMD", "BUILD");
            return self._run(buildCommand);
        });
};

CMake.prototype.getCleanCommand = function () {
    return this.path + " -E remove_directory \"" + this.workDir + "\"";
};

CMake.prototype.clean = function () {
    this.verifyIfAvailable();

    this.log.info("CMD", "CLEAN");
    return this._run(this.getCleanCommand());
};

CMake.prototype.reconfigure = function () {
    var self = this;
    return self.clean()
        .then(function () {
            return self.configure();
        });
};

CMake.prototype.rebuild = function () {
    var self = this;
    return self.clean()
        .then(function () {
            return self.build();
        });
};

CMake.prototype._run = function (command) {
    var self = this;
    self.log.info("RUN", command);
    function showOutput (output, level) {
        if (_.isArray(output)) {
            output.forEach(function (line, i) {
                line = line.trim();
                if (i === output.length - 1 && !line) {
                    return;
                }
                self.log[level]("OUT", line);
            });
        }
    }

    return new Bluebird(function (resolve, reject) {
        cli.exec(command,
            function (output) {
                showOutput(output, "info");
                resolve();
            },
            function (err, output) {
                if (err instanceof Error) {
                    reject(new Error(err.message + (output ? ("\n" + output) : "")));
                    return;
                }
                if (_.isArray(output) && output.length || err && err.message) {
                    // err is a warning string
                    showOutput(output, "warn");
                    self.log.warn("OUT", err.message);
                }
                resolve();
            });
    });
};

module.exports = CMake;