"use strict";
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let _ = require("lodash");
let TargetOptions = require("./targetOptions");
let environment = require("./environment");
let assert = require("assert");
let vsDetect = require("./vsDetect");
let path = require("path");
let CMLog = require("./cmLog");

function Toolset(options) {
    this.options = options || {};
    this.targetOptions = new TargetOptions(this.options);
    this.generator = options.generator;
    this.toolset = options.toolset;
    this.target = options.target;
    this.cCompilerPath = null;
    this.cppCompilerPath = null;
    this.compilerFlags = [];
    this.linkerFlags = [];
    this.makePath = null;
    this.log = new CMLog(this.options);
    this._initialized = false;
}

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
    // if it's already set because of options...
    if (this.generator) { 
        if (install) {
            this.log.info("TOOL", "Using " + this.options.generator + " generator, as specified from commandline.");
        }
    }
    // 2: Generator
    else if (environment.isOSX) {
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
    this._setupGNUStd(install);

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

    // 4: Build target
    if (this.options.target) {
      this.log.info("TOOL", "Building only the " + this.options.target + " target, as specified from the command line.");
    }

};

Toolset.prototype._setupGNUStd = function (install) {
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
};

Toolset.prototype.initializeWin = async(function*(install) {
    // Visual Studio:
    // if it's already set because of options...
    if (this.generator) {
        if (install) {
            this.log.info("TOOL", "Using " + this.options.generator + " generator, as specified from commandline.");
        }
        if (this.targetOptions.isX86) {
            if (install) {
                this.log.verbose("TOOL", "Setting SAFESEH:NO linker flag.");
            }
            this.linkerFlags.push("/SAFESEH:NO");
        }
        return;
    }
    let topVS = yield this._getTopSupportedVisualStudioGenerator();
    //if (!this.options.noMSVC) {
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
    }
    else {
        throw new Error("There is no Visual C++ compiler installed. Install Visual C++ Build Toolset or Visual Studio.");
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

module.exports = Toolset;
