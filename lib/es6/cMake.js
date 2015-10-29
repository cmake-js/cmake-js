"use strict";
let splitargs = require('splitargs');
let which = require("which");
let Bluebird = require("bluebird");
let fs = Bluebird.promisifyAll(require("fs-extra"));
let path = require("path");
let _ = require("lodash");
let environment = require("./environment");
let Dist = require("./dist");
let CMLog = require("./cmLog");
let vsDetect = require("./vsDetect");
let TargetOptions = require("./targetOptions");
let spawn = require('child_process').spawn;
let exec = require('child_process').exec;
let locateNAN = require("./locateNAN");
let npmconf = Bluebird.promisifyAll(require("npmconf"));
let async = Bluebird.coroutine;

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
            let stat = fs.lstatSync(options.cmakePath);
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
    let arch = " [arch]";
    options = options || {};
    return new Bluebird(function (resolve, reject) {
        let gens = [];
        if (CMake.isAvailable(options)) {
            exec((options.cmakePath || "cmake") + " --help", function (err, stdout, stderr) {
                if (err) {
                    reject(new Error(err.message + "\n" + stdout));
                }
                else {
                    try {
                        let output = environment.isWin ? stdout.split("\r\n") : stdout.split("\n");
                        let on = false;
                        output.forEach(function (line, i) {
                            if (on) {
                                let parts = line.split("=");
                                if ((parts.length === 2 && parts[0].trim()) ||
                                    (parts.length === 1 && i !== output.length - 1 && output[i + 1].trim()[0] === "=")) {
                                    let gen = parts[0].trim();
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

CMake.prototype.getConfigureCommand = async(function* () {
    // Setup VS Win64
    let vsGeneratorOverride;
    if (environment.isWin && this.targetOptions.isX64) {
        let list = yield this.getGenerators();
        let tasks = [];
        let maxVer = 0;
        for (let gen of list) {
            let found = /^visual studio (\d+)/i.exec(gen);
            if (found) {
                let ver = parseInt(found[1]);
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
        }
        yield Bluebird.all(tasks);
    }

    // Load NPM config
    let userConfig = [];
    let npmConfig = yield npmconf.loadAsync();
    let npmConfigData = {};
    if (npmConfig.sources.global && npmConfig.sources.global.data) {
        _.extend(npmConfigData, npmConfig.sources.global.data);
    }
    if (npmConfig.sources.user && npmConfig.sources.user.data) {
        _.extend(npmConfigData, npmConfig.sources.user.data);
    }
    for (let key of _.keys(npmConfigData)) {
        let ukey = key.toUpperCase();
        if (_.startsWith(ukey, "CMAKE_")) {
            let s = {};
            let sk = ukey.substr(6);
            if (sk) {
                s[sk] = npmConfigData[key];
                if (s[sk]) {
                    userConfig.push(s);
                }
            }
        }
    }
    
    // Create command:
    
    let useNinja = !environment.isWin && !this.options.preferMake && environment.isNinjaAvailable;
    let useXcode = environment.isOSX && this.options.preferXcode;
    let command = this.path;
    command += " \"" + this.projectRoot + "\" --no-warn-unused-cli";
    if (useNinja) {
        command += " -GNinja";
    }
    else if (vsGeneratorOverride) {
        command += " " + vsGeneratorOverride;
    }
    else if (useXcode) {
        command += " -GXcode";
    }

    let D = [];

    // Build configuration:
    D.push({ "CMAKE_BUILD_TYPE": this.config });
    if (!environment.isWin) {
        // If we have Make
        D.push({ "CMAKE_LIBRARY_OUTPUT_DIRECTORY": this.buildDir });
    }

    // Include and lib:
    let incPaths;
    if (this.dist.headerOnly) {
        incPaths = [path.join(this.dist.internalPath, "/include/node")];
    }
    else {
        let nodeH = path.join(this.dist.internalPath, "/src");
        let v8H = path.join(this.dist.internalPath, "/deps/v8/include");
        let uvH = path.join(this.dist.internalPath, "/deps/uv/include");
        incPaths = [nodeH, v8H, uvH];
    }
    
    // NAN
    let nanH = yield locateNAN(this.projectRoot);
    if (nanH) {
        incPaths.push(nanH);
    }

    // Includes:
    D.push({ "CMAKE_JS_INC": incPaths.join(";") });

    // Runtime:
    D.push({ "NODE_RUNTIME": this.targetOptions.runtime });
    D.push({ "NODE_RUNTIMEVERSION": this.targetOptions.runtimeVersion });
    D.push({ "NODE_ARCH": this.targetOptions.arch });

    if (environment.isWin) {
        // Win
        D.push({ "CMAKE_JS_LIB": this.dist.winLibPath });
        if (this.targetOptions.isX86) {
            D.push({ "CMAKE_SHARED_LINKER_FLAGS": "/SAFESEH:NO" });
        }
    }

    // Prefer GNU/Clang
    if (environment.isPosix) {
        if (this.options.preferClang && environment.isClangAvailable) {
            D.push({ "CMAKE_C_COMPILER": "clang" });
            D.push({ "CMAKE_CXX_COMPILER": "clang++" });
        }
        else if (this.options.preferGnu && environment.isGPPAvailable) {
            D.push({ "CMAKE_C_COMPILER": "gcc" });
            D.push({ "CMAKE_CXX_COMPILER": "g++" });
        }
    }

    if (environment.isOSX) {
        // Mac
        let cxxFlags = "-D_DARWIN_USE_64_BIT_INODE=1 -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64 -DBUILDING_NODE_EXTENSION -w";
        if (!this.options.forceNoC11) {
            cxxFlags += " -std=c++11";
        }
        D.push({ "CMAKE_CXX_FLAGS": cxxFlags });
        D.push({ "CMAKE_SHARED_LINKER_FLAGS": "-undefined dynamic_lookup" });
    }
    else if (!environment.isWin) {
        // Other POSIX
        if (!this.options.forceNoC11) {
            D.push({ "CMAKE_CXX_FLAGS": "-std=c++11" });
        }
    }

    // NPM Vars:
    for (let uc of userConfig) {
        D.push(uc);
    }

    command += " " +
        D.map(function (p) {
            return "-D" + _.keys(p)[0] + "=\"" + _.values(p)[0] + "\"";
        }).join(" ");

    return command;
});

CMake.prototype.configure = async(function* () {
    this.verifyIfAvailable();

    this.log.info("CMD", "CONFIGURE");
    let listPath = path.join(this.projectRoot, "CMakeLists.txt");
    let command = yield this.getConfigureCommand();

    try {
        yield fs.lstatAsync(listPath);
    }
    catch(e) {
        throw new Error("'" + listPath + "' not found.");
    }

    try {
        yield fs.mkdirAsync(this.workDir);
    }
    catch(e) {
        _.noop(e);
    }

    let cwd = process.cwd();
    process.chdir(this.workDir);
    try {
        yield this._run(command);
    }
    finally {
        process.chdir(cwd);
    }
});

CMake.prototype.ensureConfigured = async(function* () {
    try {
        yield fs.lstatAsync(path.join(this.workDir, "CMakeCache.txt"));
    }
    catch (e) {
        _.noop(e);
        yield this.configure();
    }
});

CMake.prototype.getBuildCommand = function () {
    return Bluebird.resolve(this.path + " --build \"" + this.workDir + "\" --config " + this.config);
};

CMake.prototype.build = async(function* () {
    this.verifyIfAvailable();

    yield this.ensureConfigured();
    let buildCommand = yield this.getBuildCommand();
    this.log.info("CMD", "BUILD");
    yield this._run(buildCommand);
});

CMake.prototype.getCleanCommand = function () {
    return this.path + " -E remove_directory \"" + this.workDir + "\"";
};

CMake.prototype.clean = function () {
    this.verifyIfAvailable();

    this.log.info("CMD", "CLEAN");
    return this._run(this.getCleanCommand());
};

CMake.prototype.reconfigure = async(function* () {
    yield this.clean();
    yield this.configure();
});

CMake.prototype.rebuild = async(function* () {
    yield this.clean();
    yield this.build();
});

CMake.prototype.compile = async(function* () {
    try {
        yield this.build();
    }
    catch (e) {
        _.noop(e);
        this.log.info("REP", "Build has been failed, trying to do a full rebuild.");
        yield this.rebuild();
    }
});

CMake.prototype._run = function (command) {
    let self = this;
    self.log.info("RUN", command);
    return new Bluebird(function (resolve, reject) {
        let args = splitargs(command);
        let name = args[0];
        args.splice(0, 1);
        let child = spawn(name, args, { stdio: "inherit" });
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
};

module.exports = CMake;
