"use strict";
var Promise = require("bluebird");
var async = Promise.coroutine;
var _ = require("lodash");
var TargetOptions = require("./targetOptions");
var environment = require("./environment");
var assert = require("assert");
var vsDetect = require("./vsDetect");
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
Toolset.prototype.initialize = async($traceurRuntime.initGeneratorFunction(function $__8(install) {
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
  }, $__8, this);
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
Toolset.prototype.initializeWin = async($traceurRuntime.initGeneratorFunction(function $__9(install) {
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
  }, $__9, this);
}));
Toolset.prototype._getTopSupportedVisualStudioGenerator = async($traceurRuntime.initGeneratorFunction(function $__10() {
  var CMake,
      vswhereGenerator,
      list,
      maxVer,
      result,
      $__4,
      $__5,
      $__6,
      $__2,
      $__1,
      gen,
      found,
      ver,
      isVS16,
      is64Bit,
      $__11,
      $__12,
      $__13,
      $__7;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          CMake = require("./cMake");
          assert(environment.isWin);
          $ctx.state = 60;
          break;
        case 60:
          $ctx.state = 2;
          return this._getGeneratorFromVSWhere();
        case 2:
          vswhereGenerator = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = (vswhereGenerator) ? 5 : 6;
          break;
        case 5:
          $ctx.returnValue = vswhereGenerator;
          $ctx.state = -2;
          break;
        case 6:
          $ctx.state = 9;
          return CMake.getGenerators(this.options);
        case 9:
          list = $ctx.sent;
          $ctx.state = 11;
          break;
        case 11:
          maxVer = 0;
          result = null;
          $__4 = true;
          $__5 = false;
          $__6 = undefined;
          $ctx.state = 62;
          break;
        case 62:
          $ctx.pushTry(44, 45);
          $ctx.state = 47;
          break;
        case 47:
          $__2 = void 0, $__1 = (list)[Symbol.iterator]();
          $ctx.state = 43;
          break;
        case 43:
          $ctx.state = (!($__4 = ($__2 = $__1.next()).done)) ? 39 : 41;
          break;
        case 31:
          $__4 = true;
          $ctx.state = 43;
          break;
        case 39:
          gen = $__2.value;
          $ctx.state = 40;
          break;
        case 40:
          found = /^visual studio (\d+)/i.exec(gen);
          $ctx.state = 34;
          break;
        case 34:
          $ctx.state = (!found) ? 31 : 13;
          break;
        case 13:
          ver = parseInt(found[1]);
          $ctx.state = 36;
          break;
        case 36:
          $ctx.state = (ver <= maxVer) ? 31 : 16;
          break;
        case 16:
          isVS16 = (16 == ver);
          $ctx.state = 38;
          break;
        case 38:
          $ctx.state = (!isVS16) ? 21 : 19;
          break;
        case 21:
          is64Bit = gen.endsWith("Win64");
          $ctx.state = 22;
          break;
        case 22:
          $ctx.state = ((this.targetOptions.isX86 && is64Bit) || (this.targetOptions.isX64 && !is64Bit)) ? 31 : 19;
          break;
        case 19:
          $__11 = vsDetect.isInstalled;
          $__12 = $__11.call(vsDetect, ver + ".0");
          $ctx.state = 29;
          break;
        case 29:
          $ctx.state = 25;
          return $__12;
        case 25:
          $__13 = $ctx.sent;
          $ctx.state = 27;
          break;
        case 27:
          $ctx.state = ($__13) ? 30 : 31;
          break;
        case 30:
          result = gen;
          maxVer = ver;
          $ctx.state = 31;
          break;
        case 41:
          $ctx.popTry();
          $ctx.state = 45;
          $ctx.finallyFallThrough = 49;
          break;
        case 44:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          $__7 = $ctx.storedException;
          $ctx.state = 50;
          break;
        case 50:
          $__5 = true;
          $__6 = $__7;
          $ctx.state = 45;
          $ctx.finallyFallThrough = 49;
          break;
        case 45:
          $ctx.popTry();
          $ctx.state = 56;
          break;
        case 56:
          try {
            if (!$__4 && $__1.return != null) {
              $__1.return();
            }
          } finally {
            if ($__5) {
              throw $__6;
            }
          }
          $ctx.state = 54;
          break;
        case 49:
          $ctx.returnValue = result;
          $ctx.state = -2;
          break;
        case 54:
          $ctx.state = $ctx.finallyFallThrough;
          break;
        default:
          return $ctx.end();
      }
  }, $__10, this);
}));
Toolset.prototype._getGeneratorFromVSWhere = async($traceurRuntime.initGeneratorFunction(function $__14() {
  var programFilesPath,
      vswhereCommand,
      vswhereOutput,
      version;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          programFilesPath = _.get(process.env, "ProgramFiles(x86)", _.get(process.env, "ProgramFiles"));
          vswhereCommand = path.resolve(programFilesPath, "Microsoft Visual Studio", "Installer", "vswhere.exe");
          $ctx.state = 11;
          break;
        case 11:
          $ctx.state = 2;
          return processHelpers.exec(("\"" + vswhereCommand + "\" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationVersion"));
        case 2:
          vswhereOutput = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = (!vswhereOutput) ? 5 : 6;
          break;
        case 5:
          $ctx.returnValue = null;
          $ctx.state = -2;
          break;
        case 6:
          version = vswhereOutput.trim();
          version = version.substring(0, version.indexOf("."));
          $ctx.state = 13;
          break;
        case 13:
          $ctx.returnValue = {
            14: "Visual Studio 14 2015",
            15: "Visual Studio 15 2017",
            16: "Visual Studio 16 2019"
          }[version] || null;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__14, this);
}));
module.exports = Toolset;

//# sourceMappingURL=toolset.js.map
