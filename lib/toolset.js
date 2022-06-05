"use strict";
let Promise = require("bluebird");
let async = Promise.coroutine;
let _ = require("lodash");
let TargetOptions = require("./targetOptions");
let environment = require("./environment");
let assert = require("assert");
let vsDetect = require("./vsDetect");
let path = require("path");
let CMLog = require("./cmLog");
let processHelpers = require("./processHelpers");

function Toolset(options) {
    this.options = options || {};
    this.targetOptions = new TargetOptions(this.options);
    this.generator = options.generator;
    this.toolset = options.toolset;
    this.platform = options.platform;
    this.target = options.target;
    this.cCompilerPath = options.cCompilerPath;
    this.cppCompilerPath = options.cppCompilerPath;
    this.compilerFlags = [];
    this.linkerFlags = [];
    this.makePath = null;
    this.log = new CMLog(this.options);
    this._initialized = false;
}

Toolset.prototype.initialize = async function (install) {
    if (!this._initialized) {
        if (environment.isWin) {
            await this.initializeWin(install);
        }
        else {
            this.initializePosix(install);
        }
        this._initialized = true;
    }
};

Toolset.prototype.initializePosix = function (install) {
    if (!this.cCompilerPath || !this.cppCompilerPath) {
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
            this.cppCompilerPath = this.cppCompilerPath || "clang++";
            this.cCompilerPath = this.cCompilerPath || "clang";
        }
        else if (this.options.preferGnu && environment.isGPPAvailable) {
            if (install) {
                this.log.info("TOOL", "Using g++ compiler, because preferGnu option is set, and g++ is available.");
            }
            this.cppCompilerPath = this.cppCompilerPath || "g++";
            this.cCompilerPath = this.cCompilerPath || "gcc";
        }
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

Toolset.prototype.initializeWin = async function (install) {
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
    let topVS = await this._getTopSupportedVisualStudioGenerator();
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

        let ver = 0;
        let found = /^visual studio (\d+)/i.exec(topVS);
        if (found) {
            ver = parseInt(found[1]);
        }
        const isAboveVS16 = ver >= 16;

        // The CMake Visual Studio Generator does not support the Win64 or ARM suffix on
        // the generator name. Instead the generator platform must be set explicitly via
        // the platform parameter
        if (!this.platform && isAboveVS16) {
            switch(this.targetOptions.arch) {
                case "ia32":
                case "x86":
                    this.platform = "Win32";
                    break;
                case "x64":
                    this.platform = "x64";
                    break;
                case "arm":
                    this.platform = "ARM";
                    break;
                case "arm64":
                    this.platform = "ARM64";
                    break;
                default:
                    this.log.warn("TOOL", "Unknown NodeJS architecture: " + this.targetOptions.arch);
                    break;
            }
        }
    }
    else {
        throw new Error("There is no Visual C++ compiler installed. Install Visual C++ Build Toolset or Visual Studio.");
    }
};

Toolset.prototype._getTopSupportedVisualStudioGenerator = async function () {
    let CMake = require("./cMake");
    assert(environment.isWin);

    let vswhereVersion = await this._getVersionFromVSWhere();

    let list = await CMake.getGenerators(this.options, this.log);
    let maxVer = 0;
    let result = null;
    for (let gen of list) {
        let found = /^visual studio (\d+)/i.exec(gen);
        if (!found) {
            continue;
        }

        let ver = parseInt(found[1]);
        if (ver <= maxVer) {
            continue;
        }

        // unlike previous versions "Visual Studio 16 2019" doesn't end with arch name
        const isAboveVS16 = ver >= 16;
        if (!isAboveVS16) {
            const is64Bit = gen.endsWith("Win64");
            if ((this.targetOptions.isX86 && is64Bit) || (this.targetOptions.isX64 && !is64Bit)) {
                continue;
            }
        }

        if (ver === vswhereVersion || (await vsDetect.isInstalled(ver + ".0"))) {
            result = gen;
            maxVer = ver;
        }
    }
    return result;
};

Toolset.prototype._getVersionFromVSWhere = async function () {
    let programFilesPath = _.get(process.env, "ProgramFiles(x86)", _.get(process.env, "ProgramFiles"));
    let vswhereCommand = path.resolve(programFilesPath, "Microsoft Visual Studio", "Installer", "vswhere.exe");
    let vswhereOutput = null;

    try {
        this.log.verbose("TOOL", `Looking for vswhere.exe at '${vswhereCommand}'.`);
        vswhereOutput = await processHelpers.execFile([vswhereCommand, "-latest", "-products", "*", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-property", "installationVersion"]);
    }
    catch (e) {
        this.log.verbose("TOOL", "Could not find vswhere.exe (VS installation is probably older than 15.2).");
        return null;
    }

    if (!vswhereOutput) {
        return null;
    }

    let version = vswhereOutput.trim();
    version = version.substring(0, version.indexOf("."));

    return Number(version);
};

module.exports = Toolset;
