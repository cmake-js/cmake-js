"use strict";
var Promise = require("bluebird");
var async = Promise.coroutine;
var _ = require("lodash");
var TargetOptions = require("./targetOptions");
var environment = require("./environment");
var assert = require("assert");
var path = require("path");
var CMLog = require("./cmLog");
var processHelpers = require("./processHelpers");
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
Toolset.prototype.initialize = async($traceurRuntime.initGeneratorFunction(function $__1(install) {
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = (!this._initialized) ? 7 : -2;
          break;
        case 7:
          $ctx.state = (environment.isWin) ? 1 : 5;
          break;
        case 1:
          $ctx.state = 2;
          return this.initializeWin(install);
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 5:
          this.initializePosix(install);
          $ctx.state = 4;
          break;
        case 4:
          this._initialized = true;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__1, this);
}));
Toolset.prototype.initializePosix = function(install) {
  if (!environment.isGPPAvailable && !environment.isClangAvailable) {
    if (environment.isOSX) {
      throw new Error("C++ Compiler toolset is not available. Install Xcode Commandline Tools from Apple Dev Center, or install Clang with homebrew by invoking: 'brew install llvm --with-clang --with-asan'.");
    } else {
      throw new Error("C++ Compiler toolset is not available. Install proper compiler toolset with your package manager, eg. 'sudo apt-get install g++'.");
    }
  }
  if (this.options.preferClang && environment.isClangAvailable) {
    if (install) {
      this.log.info("TOOL", "Using clang++ compiler, because preferClang option is set, and clang++ is available.");
    }
    this.cppCompilerPath = "clang++";
    this.cCompilerPath = "clang";
  } else if (this.options.preferGnu && environment.isGPPAvailable) {
    if (install) {
      this.log.info("TOOL", "Using g++ compiler, because preferGnu option is set, and g++ is available.");
    }
    this.cppCompilerPath = "g++";
    this.cCompilerPath = "gcc";
  }
  if (this.generator) {
    if (install) {
      this.log.info("TOOL", "Using " + this.options.generator + " generator, as specified from commandline.");
    }
  } else if (environment.isOSX) {
    if (this.options.preferXcode) {
      if (install) {
        this.log.info("TOOL", "Using Xcode generator, because preferXcode option is set.");
      }
      this.generator = "Xcode";
    } else if (this.options.preferMake && environment.isMakeAvailable) {
      if (install) {
        this.log.info("TOOL", "Using Unix Makefiles generator, because preferMake option is set, and make is available.");
      }
      this.generator = "Unix Makefiles";
    } else if (environment.isNinjaAvailable) {
      if (install) {
        this.log.info("TOOL", "Using Ninja generator, because ninja is available.");
      }
      this.generator = "Ninja";
    } else {
      if (install) {
        this.log.info("TOOL", "Using Unix Makefiles generator.");
      }
      this.generator = "Unix Makefiles";
    }
  } else {
    if (this.options.preferMake && environment.isMakeAvailable) {
      if (install) {
        this.log.info("TOOL", "Using Unix Makefiles generator, because preferMake option is set, and make is available.");
      }
      this.generator = "Unix Makefiles";
    } else if (environment.isNinjaAvailable) {
      if (install) {
        this.log.info("TOOL", "Using Ninja generator, because ninja is available.");
      }
      this.generator = "Ninja";
    } else {
      if (install) {
        this.log.info("TOOL", "Using Unix Makefiles generator.");
      }
      this.generator = "Unix Makefiles";
    }
  }
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
  if (this.options.target) {
    this.log.info("TOOL", "Building only the " + this.options.target + " target, as specified from the command line.");
  }
};
Toolset.prototype.initializeWin = async($traceurRuntime.initGeneratorFunction(function $__2(install) {
  var topVS;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = (this.generator) ? 3 : 2;
          break;
        case 3:
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
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = -2;
          break;
        case 2:
          $ctx.state = 7;
          return this._getTopSupportedVisualStudioGenerator();
        case 7:
          topVS = $ctx.sent;
          $ctx.state = 9;
          break;
        case 9:
          if (topVS) {
            if (install) {
              this.log.info("TOOL", ("Using " + topVS + " generator."));
            }
            this.generator = topVS;
            this.linkerFlags.push("/DELAYLOAD:NODE.EXE");
            if (this.targetOptions.isX86) {
              if (install) {
                this.log.verbose("TOOL", "Setting SAFESEH:NO linker flag.");
              }
              this.linkerFlags.push("/SAFESEH:NO");
            }
          } else {
            throw new Error("There is no Visual C++ compiler installed. Install Visual C++ Build Toolset or Visual Studio.");
          }
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__2, this);
}));
Toolset.prototype._getTopSupportedVisualStudioGenerator = async($traceurRuntime.initGeneratorFunction(function $__3() {
  var programFilesPath,
      vswhereCommand,
      vswhereOutput,
      version,
      generator,
      cppBuildToolsOutput;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          assert(environment.isWin);
          programFilesPath = _.get(process.env, "ProgramFiles(x86)", _.get(process.env, "ProgramFiles"));
          vswhereCommand = path.resolve(programFilesPath, "Microsoft Visual Studio", "Installer", "vswhere.exe");
          $ctx.state = 21;
          break;
        case 21:
          $ctx.state = 2;
          return processHelpers.exec(("\"" + vswhereCommand + "\" -property installationVersion"));
        case 2:
          vswhereOutput = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = (!vswhereOutput) ? 5 : 6;
          break;
        case 5:
          $ctx.returnValue = windowBuildToolsPackageGeneratorOrNull();
          $ctx.state = -2;
          break;
        case 6:
          version = vswhereOutput.trim();
          version = version.substring(0, version.indexOf("."));
          generator = {
            "14": "Visual Studio 14 2015",
            "15": "Visual Studio 15 2017",
            "16": "Visual Studio 16 2019"
          }[version];
          $ctx.state = 23;
          break;
        case 23:
          $ctx.state = (!generator) ? 8 : 9;
          break;
        case 8:
          $ctx.returnValue = windowBuildToolsPackageGeneratorOrNull();
          $ctx.state = -2;
          break;
        case 9:
          $ctx.state = 12;
          return processHelpers.exec(("\"" + vswhereCommand + "\" -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64"));
        case 12:
          cppBuildToolsOutput = $ctx.sent;
          $ctx.state = 14;
          break;
        case 14:
          $ctx.state = (!cppBuildToolsOutput || cppBuildToolsOutput.indexOf("installationVersion: " + version) === -1) ? 15 : 16;
          break;
        case 15:
          $ctx.returnValue = null;
          $ctx.state = -2;
          break;
        case 16:
          $ctx.returnValue = generator;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__3, this);
}));
module.exports = Toolset;
function windowBuildToolsPackageGeneratorOrNull() {
  return hasGlobalPackage("windows-build-tools") ? "Visual Studio 15 2017" : null;
}
function hasGlobalPackage(packageName) {
  var childProcess = require('child_process');
  var path = require('path');
  var fs = require('fs');
  var globalNodeModules = childProcess.execSync('npm root -g').toString().trim();
  var packageDir = path.join(globalNodeModules, packageName);
  if (fs.existsSync(packageDir)) {
    return true;
  }
  packageDir = path.join(globalNodeModules, 'npm/node_modules', packageName);
  return fs.existsSync(packageDir);
}

//# sourceMappingURL=toolset.js.map
