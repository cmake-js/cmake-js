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

let make = {
    version: "3.81.0",
    files: [
        {
            path: "http://downloads.sourceforge.net/project/gnuwin32/make/3.81/make-3.81-bin.zip?r=http%3A%2F%2Fgnuwin32.sourceforge.net%2Fpackages%2Fmake.htm&ts=1446755915",
            md5: "3521948bc27a31d1ade0dcb23be16d49"
        },
        {
            path: "http://downloads.sourceforge.net/project/gnuwin32/make/3.81/make-3.81-dep.zip?r=http%3A%2F%2Fgnuwin32.sourceforge.net%2Fpackages%2Fmake.htm&ts=1446755974&use_mirror=netix",
            md5: "d370415aa924fa023411c4099ef84563"
        }
    ]
};

function Toolset(options) {
    this.options = options || {};
    this.targetOptions = new TargetOptions(this.options);
    this.generator = null;
    this.compiler = null;
    this.compilerFlags = [];
    this.linkerFlags = [];
    this.makePath = null;
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
        get: function() {
            return path.join(this.gnuToolsetInstallPath, "compiler");
        }
    },
    gnuMakeInstallPath: {
        get: function() {
            return path.join(this.gnuToolsetInstallPath, "make");
        }
    },
    installedGppExePath: {
        get: function() {
            return path.join(this.gnuCompilerInstallPath, "bin", "g++.exe");
        }
    },
    installedMakeExePath: {
        get: function() {
            return path.join(this.gnuMakeInstallPath, "bin", "make.exe");
        }
    }
});

Toolset.prototype.initialize = async(function*(install) {
    if (environment.isWin) {
        yield this.initializeWin(install);
    }
    else {
        this.initializePosix();
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
        this.compiler = "clang++";
    }
    else if (this.options.preferGnu && environment.isGPPAvailable) {
        this.compiler = "g++";
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
    let topVS = yield this._getTopSupportedVisualStudioGenerator();

    // Visual Studio:
    if (topVS) {
        this.generator = topVS;
        if (this.targetOptions.isX64) {
            this.linkerFlags.push("/SAFESEH:NO");
        }
        return;
    }

    // Make

    // TGM GNU
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

Toolset.prototype.getInstalledGppExeVersion = function() {
    return this._getInstalledExeVersion(this.installedGppExePath);
};

Toolset.prototype.getInstalledMakeExeVersion = function() {
    return this._getInstalledExeVersion(this.installedMakeExePath);
};

Toolset.prototype._getInstalledExeVersion = async(function*(exePath) {
    let exists;
    try {
        exists = !(yield fs.statAsync(exePath).isDirectory());
    }
    catch(e) {
        _.noop(e);
        exists = false;
    }
    if (!exists) {
        return null;
    }
    try {
        let stdout = yield processHelpers.exec(exePath);
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