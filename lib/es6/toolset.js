"use strict";
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let _ = require("lodash");
let TargetOptions = require("./targetOptions");
let environment = require("./environment");
let assert = require("assert");
let vsDetect = require("./vsDetect");
let path = require("path");
let processHelpers = require("./processHelpers");
let fs = Bluebird.promisifyAll(require("fs-extra"));
let CMLog = require("./cmLog");
let which = Bluebird.promisify(require("which"));
let semver = require("semver");
let Downloader = require("./downloader");
let makeDistro = require("../../dist/makeDistro.json");
let gnuCompilerDistro = require("../../dist/gnuCompilerDistro.json");

function Toolset(options) {
    this.options = options || {};
    this.targetOptions = new TargetOptions(this.options);
    this.generator = null;
    this.cCompilerPath = null;
    this.cppCompilerPath = null;
    this.compilerFlags = [];
    this.linkerFlags = [];
    this.makePath = null;
    this.log = new CMLog(this.options);
    this._initialized = false;
    this.downloader = new Downloader(this.options);
}

Object.defineProperties(Toolset.prototype, {
    gnuToolsetInstallPath: {
        get: function () {
            return path.join(
                environment.home,
                ".cmake-js",
                "gnu-toolset-" + this.targetOptions.arch);
        }
    },
    gnuCompilerInstallPath: {
        get: function () {
            return path.join(this.gnuToolsetInstallPath, "compiler");
        }
    },
    gnuMakeInstallPath: {
        get: function () {
            return path.join(this.gnuToolsetInstallPath, "make");
        }
    },
    gppExeName: {
        get: function () {
            return this.targetOptions.isX64 ? "g++.exe" : "g++-dw2.exe";
        }
    },
    installedGppExePath: {
        get: function () {
            return path.join(this.gnuCompilerInstallPath, "bin", this.gppExeName);
        }
    },
    installedGccExePath: {
        get: function () {
            return path.join(this.gnuCompilerInstallPath, "bin", "gcc.exe");
        }
    },
    installedMakeExePath: {
        get: function () {
            return path.join(this.gnuMakeInstallPath, "bin", "make.exe");
        }
    }
});

Toolset.prototype.initialize = async(function*(install) {
    if (!this._initialized) {
        if (environment.isWin) {
            yield this.initializeWin(install);
        }
        else {
            this.initializePosix(install);
        }
        this._initialized = true;
    }
});

Toolset.prototype.initializePosix = function (install) {
    // 1: Compiler
    if (!environment.isGPPAvailable && !environment.isClangAvailable) {
        if (environment.isOSX) {
            throw new Error("C++ Compiler toolset is not available. Install Xcode Commandline Tools from Apple Dev Center, or install Clang with homebrew by invoking: 'brew install llvm --with-clang --with-asan'.");
        }
        else {
            throw new Error("C++ Compiler toolset is not available. Install proper compiler toolset with your package manager, eg. 'sudo apt-get install g++'.");
        }
    }

    if (this.options.preferClang && environment.isClangAvailable) {
        if (install) {
            this.log.info("TOOL", "Using clang++ compiler, because preferClang option is set, and clang++ is available.");
        }
        this.cppCompilerPath = "clang++";
        this.cCompilerPath = "clang";
    }
    else if (this.options.preferGnu && environment.isGPPAvailable) {
        if (install) {
            this.log.info("TOOL", "Using g++ compiler, because preferGnu option is set, and g++ is available.");
        }
        this.cppCompilerPath = "g++";
        this.cCompilerPath = "gcc";
    }

    // 2: Generator
    if (environment.isOSX) {
        if (this.options.preferXcode) {
            if (install) {
                this.log.info("TOOL", "Using Xcode generator, because preferXcode option is set.");
            }
            this.generator = "Xcode";
        }
        else if (this.options.preferMake && environment.isMakeAvailable) {
            if (install) {
                this.log.info("TOOL", "Using Unix Makefiles generator, because preferMake option is set, and make is available.");
            }
            this.generator = "Unix Makefiles";
        }
        else if (environment.isNinjaAvailable) {
            if (install) {
                this.log.info("TOOL", "Using Ninja generator, because ninja is available.");
            }
            this.generator = "Ninja";
        }
        else {
            if (install) {
                this.log.info("TOOL", "Using Unix Makefiles generator.");
            }
            this.generator = "Unix Makefiles";
        }
    }
    else {
        if (this.options.preferMake && environment.isMakeAvailable) {
            if (install) {
                this.log.info("TOOL", "Using Unix Makefiles generator, because preferMake option is set, and make is available.");
            }
            this.generator = "Unix Makefiles";
        }
        else if (environment.isNinjaAvailable) {
            if (install) {
                this.log.info("TOOL", "Using Ninja generator, because ninja is available.");
            }
            this.generator = "Ninja";
        }
        else {
            if (install) {
                this.log.info("TOOL", "Using Unix Makefiles generator.");
            }
            this.generator = "Unix Makefiles";
        }
    }

    // 3: Flags
    if (this.options.std) {
        if (this.options.std !== "c++98") {
            if (install) {
                this.log.info("TOOL", `Using ${this.options.std} compiler standard.`);
            }
            this.compilerFlags.push("-std=" + this.options.std);
        }
    }
    else {
        if (install) {
            this.log.info("TOOL", "Using c++11 compiler standard.");
        }
        this.compilerFlags.push("-std=c++11");
    }

    if (environment.isOSX) {
        if (install) {
            this.log.verbose("TOOL", "Setting default OSX compiler flags.");
        }

        this.compilerFlags.push("-D_DARWIN_USE_64_BIT_INODE=1");
        this.compilerFlags.push("-D_LARGEFILE_SOURCE");
        this.compilerFlags.push("-D_FILE_OFFSET_BITS=64");
        this.compilerFlags.push("-DBUILDING_NODE_EXTENSION");
        this.compilerFlags.push("-w");
        this.linkerFlags.push("-undefined dynamic_lookup");
    }
};

Toolset.prototype.initializeWin = async(function*(install) {
    // Visual Studio:
    let topVS = yield this._getTopSupportedVisualStudioGenerator();
    if (!this.options.noMSVC) {
        if (topVS) {
            if (install) {
                this.log.info("TOOL", `Using ${topVS} generator.`);
            }
            this.generator = topVS;
            if (this.targetOptions.isX86) {
                if (install) {
                    this.log.verbose("TOOL", "Setting SAFESEH:NO linker flag.");
                }
                this.linkerFlags.push("/SAFESEH:NO");
            }
            return;
        }
    }
    else {
        this.log.verbose("TOOL", `Visual C++ generator '${topVS}' available, but it is skipped because noMSVC option has been speified.`);
    }

    // Make
    this.generator = "Unix Makefiles";

    let sysMake = null;
    let sysMakeVersion = null;
    try {
        sysMake = yield which("make");
    }
    catch (e) {
        _.noop(e);
    }
    if (sysMake) {
        try {
            sysMakeVersion = yield this._getVersion(sysMake);
        }
        catch (e) {
            _.noop(e);
        }
    }
    if (!sysMakeVersion || semver.lt(sysMakeVersion, makeDistro.version)) {
        let installedMakeVersion = yield this.getInstalledMakeExeVersion();
        if (!installedMakeVersion && !install) {
            throw new Error(makeDistro.name + " is not available.");
        }
        if (!installedMakeVersion || semver.lt(installedMakeVersion, makeDistro.version)) {
            yield this._downloadDistro(makeDistro, this.gnuMakeInstallPath);
        }
        this.makePath = this.installedMakeExePath;
    }

    // TGM GNU
    let sysCompiler = null;
    let sysCompilerVersion = null;
    try {
        sysCompiler = yield which(this.gppExeName);
    }
    catch (e) {
        _.noop(e);
    }
    if (sysCompiler) {
        try {
            sysCompilerVersion = yield this._getVersion(sysCompiler);
        }
        catch (e) {
            _.noop(e);
        }
    }
    let compilerDistro = this.targetOptions.isX64 ? gnuCompilerDistro.x64 : gnuCompilerDistro.x86;
    if (!sysCompilerVersion || semver.lt(sysCompilerVersion, compilerDistro.version)) {
        let installedCompilerVersion = yield this.getInstalledGppExeVersion();
        if (!installedCompilerVersion && !install) {
            throw new Error("GNU compiler toolset is not available.");
        }
        if (!installedCompilerVersion || semver.lt(installedCompilerVersion, compilerDistro.version)) {
            yield this._downloadDistro(compilerDistro, this.gnuCompilerInstallPath);
        }
        this.cppCompilerPath = this.installedGppExePath;
        this.cCompilerPath = this.installedGccExePath;
    }
});

Toolset.prototype._downloadDistro = async(function*(distro, path) {
    this.log.info("TOOL", `Downloading ${distro.name} to: ${path}`);
    yield fs.removeAsync(path);
    for (let file of distro.files) {
        this.log.http("TOOL", "\t- " + file.fileName);
        let options = {
            path: path
        };
        if (distro.md5) {
            options.hash = "md5";
            options.sum = file.md5;
        }
        else if (distro.sha256) {
            options.hash = "sha256";
            options.sum = file.sha256;
        }
        yield this.downloader.downloadZip(file.url, options);
    }
});

Toolset.prototype._getTopSupportedVisualStudioGenerator = async(function*() {
    let CMake = require("./cMake");
    assert(environment.isWin);
    let list = yield CMake.getGenerators(this.options);
    let maxVer = 0;
    let result = null;
    for (let gen of list) {
        let found = /^visual studio (\d+)/i.exec(gen);
        if (found) {
            let ver = parseInt(found[1]);
            if (ver > maxVer) {
                if (yield vsDetect.isInstalled(ver + ".0")) {
                    result = this.targetOptions.isX64 ? (gen + " Win64") : gen;
                    maxVer = ver;
                }
            }
        }
    }
    return result;
});

Toolset.prototype.getInstalledGppExeVersion = function () {
    return this._getVersion(this.installedGppExePath);
};

Toolset.prototype.getInstalledMakeExeVersion = function () {
    return this._getVersion(this.installedMakeExePath);
};

Toolset.prototype._getVersion = async(function*(exePath) {
    let exists;
    try {
        exists = !(yield fs.statAsync(exePath)).isDirectory();
    }
    catch (e) {
        _.noop(e);
        exists = false;
    }
    if (!exists) {
        return null;
    }
    try {
        let stdout = yield processHelpers.exec(exePath + " --version");
        if (stdout) {
            let firstLine = stdout.split("\n")[0];
            if (firstLine) {
                let match = /\d+\.\d+(\.\d+)/.exec(firstLine);
                if (match) {
                    if (match.length === 2) {
                        return match[0];
                    }
                    else {
                        return match[0] + ".0";
                    }
                }
            }
        }
    }
    catch (e) {
        _.noop(e);
    }
    return null;
});

module.exports = Toolset;