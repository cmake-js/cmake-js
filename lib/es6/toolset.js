"use strict";
let Promise = require("bluebird");
let async = Promise.coroutine;
let _ = require("lodash");
let TargetOptions = require("./targetOptions");
let environment = require("./environment");
let assert = require("assert");
let path = require("path");
let CMLog = require("./cmLog");
let processHelpers = require("./processHelpers");

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
    if (environment.isOSX) {
        if (install) {
            this.log.verbose("TOOL", "Setting default OSX compiler flags.");
        }

        this.compilerFlags.push("-D_DARWIN_USE_64_BIT_INODE=1");
        this.compilerFlags.push("-D_LARGEFILE_SOURCE");
        this.compilerFlags.push("-D_FILE_OFFSET_BITS=64");
        this.compilerFlags.push("-DBUILDING_NODE_EXTENSION");
        this.linkerFlags.push("-undefined dynamic_lookup");
    }

    // 4: Build target
    if (this.options.target) {
        this.log.info("TOOL", "Building only the " + this.options.target + " target, as specified from the command line.");
    }
};

Toolset.prototype.initializeWin = async(function*(install) {
    // Visual Studio:
    // if it's already set because of options...
    if (this.generator) {
        if (install) {
            this.log.info("TOOL", "Using " + this.options.generator + " generator, as specified from commandline.");
        }

        this.linkerFlags.push("/DELAYLOAD:NODE.EXE");

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

        this.linkerFlags.push("/DELAYLOAD:NODE.EXE");

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
    assert(environment.isWin);

    let hasWindowsBuildToolsPackage = false;
    try {
        hasGlobalPackage("windows-build-tools");
        hasWindowsBuildToolsPackage = true;
    } catch(e) {console.log("no windows-build-tools", e)}

    let programFilesPath = _.get(process.env, "ProgramFiles(x86)", _.get(process.env, "ProgramFiles"));
    let vswhereCommand = path.resolve(programFilesPath, "Microsoft Visual Studio", "Installer", "vswhere.exe");
    const vswhereOutput = yield processHelpers.exec(`"${vswhereCommand}" -property installationVersion`);
    if (!vswhereOutput) {
        if (hasWindowsBuildToolsPackage) {
            return "Visual Studio 15 2017";
        }
        return null;
    }

    let version = vswhereOutput.trim();
    version = version.substring(0, version.indexOf("."));
    const generator = {
        "14": "Visual Studio 14 2015",
        "15": "Visual Studio 15 2017",
        "16": "Visual Studio 16 2019",
    }[version];

    if (!generator) {
        return null;
    }

    const cppBuildToolsOutput = yield processHelpers.exec(`"${vswhereCommand}" -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64`);
    if (!cppBuildToolsOutput || cppBuildToolsOutput.indexOf("installationVersion: " + version) === -1) {
        return null;
    }

    return generator;
});

module.exports = Toolset;

function hasGlobalPackage(packageName) {
    var childProcess = require('child_process');
    var path = require('path');
    var fs = require('fs');
  
    var globalNodeModules = childProcess.execSync('npm root -g').toString().trim();
    var packageDir = path.join(globalNodeModules, packageName);
    if (fs.existsSync(packageDir)) {
        return true;
    }
    
    packageDir = path.join(globalNodeModules, 'npm/node_modules', packageName); //find package required by old npm
    return fs.existsSync(packageDir);
}
