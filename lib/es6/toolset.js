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
let downloader = require("./downloader");
let makeDistro = require("../../dist/makeDistro.json");
let gnuCompilerDistro = require("../../dist/gnuCompilerDistro.json");

function Toolset(options) {
    this.options = options || {};
    this.targetOptions = new TargetOptions(this.options);
    this.generator = null;
    this.compilerPath = null;
    this.compilerFlags = [];
    this.linkerFlags = [];
    this.makePath = null;
    this.log = new CMLog(this.options);
    this._initialized = false;
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
            this.initializePosix();
        }
        this._initialized = true;
    }
});

Toolset.prototype.initializePosix = function () {
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
        this.compilerPath = "clang++";
    }
    else if (this.options.preferGnu && environment.isGPPAvailable) {
        this.compilerPath = "g++";
    }

    // 2: Generator
    if (environment.isOSX) {
        if (this.options.preferXcode) {
            this.generator = "Xcode";
        }
        else if (this.options.preferMake && environment.isMakeAvailable) {
            this.generator = "Unix Makefiles";
        }
        else if (environment.isNinjaAvailable) {
            this.generator = "Ninja";
        }
        else {
            this.generator = "Unix Makefiles";
        }
    }
    else {
        if (this.options.preferMake && environment.isMakeAvailable) {
            this.generator = "Unix Makefiles";
        }
        else if (environment.isNinjaAvailable) {
            this.generator = "Ninja";
        }
        else {
            this.generator = "Unix Makefiles";
        }
    }

    // 3: Flags
    if (this.options.std) {
        if (this.options.std !== "c++98") {
            this.compilerFlags.push("-std=" + this.options.std);
        }
    }
    else {
        this.compilerFlags.push("-std=c++11");
    }

    if (environment.isOSX) {
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
    if (topVS) {
        this.generator = topVS;
        if (this.targetOptions.isX86) {
            this.linkerFlags.push("/SAFESEH:NO");
        }
        return;
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
            sysMakeVersion = this._getVersion(sysMake);
        }
        catch (e) {
            _.noop(e);
        }
    }
    if (!sysMakeVersion || semver.lt(sysMakeVersion, makeDistro.version)) {
        let installedMakeVersion = this.getInstalledMakeExeVersion();
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
            sysCompilerVersion = this._getVersion(sysCompiler);
        }
        catch (e) {
            _.noop(e);
        }
    }
    let compilerDistro = this.targetOptions.isX64 ? gnuCompilerDistro.x64 : gnuCompilerDistro.x86;
    if (!sysCompilerVersion || semver.lt(sysCompilerVersion, compilerDistro.version)) {
        let installedCompilerVersion = this.getInstalledCompilerExeVersion();
        if (!installedCompilerVersion && !install) {
            throw new Error("GNU compiler toolset is not available.");
        }
        if (!installedCompilerVersion || semver.lt(installedCompilerVersion, compilerDistro.version)) {
            yield this._downloadDistro(compilerDistro, this.gnuCompilerInstallPath);
        }
        this.compilerPath = this.installedGppExePath;
    }
});

Toolset.prototype._downloadDistro = async(function*(distro, path) {
    this.log.info("TST", `Downloading ${distro.name} to: ${path}`);
    yield fs.removeAsync(path);
    for (let file of distro.files) {
        this.log.http("TST", "\t- " + file.fileName);
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
        yield downloader.downloadZip(file.url, options);
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
        exists = !(yield fs.statAsync(exePath).isDirectory());
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