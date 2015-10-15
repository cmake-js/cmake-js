"use strict";
var splitargs = require('splitargs');
var which = require("which");
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var path = require("path");
var _ = require("lodash");
var environment = require("./environment");
var Dist = require("./dist");
var CMLog = require("./cmLog");
var vsDetect = require("./vsDetect");
var TargetOptions = require("./targetOptions");
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var locateNAN = require("./locateNAN");
var npmconf = Bluebird.promisifyAll(require("npmconf"));

function CMake(options) {
    this.options = options || {};
    this.log = new CMLog(this.options);
    this.dist = new Dist(this.options);
    this.projectRoot = path.resolve(this.options.directory || process.cwd());
    this.workDir = path.join(this.projectRoot, "build");
    this.config = this.options.debug ? "Debug" : "Release";
    this.buildDir = path.join(this.workDir, this.config);
    this._isAvailable = null;
    this.targetOptions = new TargetOptions(this.options);
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
    var arch = " [arch]";
    options = options || {};
    return new Bluebird(function (resolve, reject) {
        var gens = [];
        if (CMake.isAvailable(options)) {
            exec((options.cmakePath || "cmake") + " --help", function (err, stdout, stderr) {
                if (err) {
                    reject(new Error(err.message + "\n" + stdout));
                }
                else {
                    try {
                        var output = environment.isWin ? stdout.split("\r\n") : stdout.split("\n");
                        var on = false;
                        output.forEach(function (line, i) {
                            if (on) {
                                var parts = line.split("=");
                                if ((parts.length === 2 && parts[0].trim()) ||
                                    (parts.length === 1 && i !== output.length - 1 && output[i + 1].trim()[0] === "=")) {
                                    var gen = parts[0].trim();
                                    if (_.endsWith(gen, arch)) {
                                        gen = gen.substr(0, gen.length - arch.length);
                                    }
                                    gens.push(gen);
                                }
                            }
                            if (line.trim() === "Generators") {
                                on = true;
                            }
                        });
                    }
                    catch (e) {
                        reject(e);
                        return;
                    }
                    resolve(gens);
                }
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
    if (environment.isWin && self.targetOptions.isX64) {
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

    // Load NPM config
    var userConfig = [];
    init = init.then(function() {
        return npmconf.loadAsync()
            .then(function(result) {
                var data = {};
                if (result.sources.global && result.sources.global.data) {
                    _.extend(data, result.sources.global.data);
                }
                if (result.sources.user && result.sources.user.data) {
                    _.extend(data, result.sources.user.data);
                }
                var keys = _.keys(data);
                _.forEach(keys, function(key) {
                    var ukey = key.toUpperCase();
                    if (_.startsWith(ukey, "CMAKE_")) {
                        var s = {};
                        var sk = ukey.substr(6);
                        if (sk) {
                            s[sk] = data[key];
                            if (s[sk]) {
                                userConfig.push(s);
                            }
                        }
                    }
                });
            });
    });

    return init.then(function () {
        var useNinja = !environment.isWin && !self.options.preferMake && environment.isNinjaAvailable;
        var command = self.path;
        command += " \"" + self.projectRoot + "\" --no-warn-unused-cli";
        if (useNinja) {
            command += " -GNinja";
        }
        else if (vsGeneratorOverride) {
            command += " " + vsGeneratorOverride;
        }
        var D = [];

        // Build configuration:
        D.push({ "CMAKE_BUILD_TYPE": self.config });
        if (!environment.isWin) {
            // If we have Make
            D.push({ "CMAKE_LIBRARY_OUTPUT_DIRECTORY": self.buildDir });
        }

        // Include and lib:
        var incPaths;
        if (self.dist.headerOnly) {
            incPaths = [path.join(self.dist.internalPath, "/include/node")];
        }
        else {
            var nodeH = path.join(self.dist.internalPath, "/src");
            var v8H = path.join(self.dist.internalPath, "/deps/v8/include");
            var uvH = path.join(self.dist.internalPath, "/deps/uv/include");
            incPaths = [nodeH, v8H, uvH];
        }
        return locateNAN(self.projectRoot)
            .then(function (nanH) {
                if (nanH) {
                    incPaths.push(nanH);
                }

                // Includes:
                D.push({ "CMAKE_JS_INC": incPaths.join(";") });

                // Runtime:
                D.push({ "NODE_RUNTIME": self.targetOptions.runtime });
                D.push({ "NODE_RUNTIMEVERSION": self.targetOptions.runtimeVersion });
                D.push({ "NODE_ARCH": self.targetOptions.arch });

                if (environment.isWin) {
                    // Win
                    D.push({ "CMAKE_JS_LIB": self.dist.winLibPath });
                    if (self.targetOptions.isX86) {
                        D.push({ "CMAKE_SHARED_LINKER_FLAGS": "/SAFESEH:NO" });
                    }
                }

                // Prefer Clang
                var useClang = !environment.isWin && !self.options.preferGnu && environment.isClangAvailable;
                if (useClang) {
                    D.push({ "CMAKE_C_COMPILER": "clang" });
                    D.push({ "CMAKE_CXX_COMPILER": "clang++" });
                }

                if (environment.isOSX) {
                    // Mac
                    var cxxFlags = "-D_DARWIN_USE_64_BIT_INODE=1 -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64 -DBUILDING_NODE_EXTENSION -w";
                    if (!self.options.forceNoC11) {
                        cxxFlags += " -std=c++11";
                    }
                    D.push({ "CMAKE_CXX_FLAGS": cxxFlags });
                    D.push({ "CMAKE_SHARED_LINKER_FLAGS": "-undefined dynamic_lookup" });
                }
                else if (!environment.isWin) {
                    // Other POSIX
                    if (!self.options.forceNoC11) {
                        D.push({ "CMAKE_CXX_FLAGS": "-std=c++11" });
                    }
                }

                // NPM Vars:
                _.forEach(userConfig, function(uc) {
                    D.push(uc);
                });

                command += " " +
                D.map(function (p) {
                    return "-D" + _.keys(p)[0] + "=\"" + _.values(p)[0] + "\"";
                }).join(" ");

                return command;
            });
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
    return new Bluebird(function (resolve, reject) {
        var args = splitargs(command);
        var name = args[0];
        args.splice(0, 1);
        var child = spawn(name, args, { stdio: "inherit" });
        var ended = false;
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
};

module.exports = CMake;