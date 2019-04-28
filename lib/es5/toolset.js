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
          $ctx.state = 50;
          break;
        case 50:
          $ctx.state = 2;
          return CMake.getGenerators(this.options);
        case 2:
          list = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          maxVer = 0;
          result = null;
          $__4 = true;
          $__5 = false;
          $__6 = undefined;
          $ctx.state = 52;
          break;
        case 52:
          $ctx.pushTry(34, 35);
          $ctx.state = 37;
          break;
        case 37:
          $__2 = void 0, $__1 = (list)[Symbol.iterator]();
          $ctx.state = 33;
          break;
        case 33:
          $ctx.state = (!($__4 = ($__2 = $__1.next()).done)) ? 29 : 31;
          break;
        case 21:
          $__4 = true;
          $ctx.state = 33;
          break;
        case 29:
          gen = $__2.value;
          $ctx.state = 30;
          break;
        case 30:
          found = /^visual studio (\d+)/i.exec(gen);
          $ctx.state = 24;
          break;
        case 24:
          $ctx.state = (!found) ? 21 : 6;
          break;
        case 6:
          ver = parseInt(found[1]);
          $ctx.state = 26;
          break;
        case 26:
          $ctx.state = (ver <= maxVer) ? 21 : 9;
          break;
        case 9:
          is64Bit = gen.endsWith("Win64");
          $ctx.state = 28;
          break;
        case 28:
          $ctx.state = ((this.targetOptions.isX86 && is64Bit) || (this.targetOptions.isX64 && !is64Bit)) ? 21 : 12;
          break;
        case 12:
          $__11 = vsDetect.isInstalled;
          $__12 = $__11.call(vsDetect, ver + ".0");
          $ctx.state = 19;
          break;
        case 19:
          $ctx.state = 15;
          return $__12;
        case 15:
          $__13 = $ctx.sent;
          $ctx.state = 17;
          break;
        case 17:
          $ctx.state = ($__13) ? 20 : 21;
          break;
        case 20:
          result = gen;
          maxVer = ver;
          $ctx.state = 21;
          break;
        case 31:
          $ctx.popTry();
          $ctx.state = 35;
          $ctx.finallyFallThrough = 39;
          break;
        case 34:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          $__7 = $ctx.storedException;
          $ctx.state = 40;
          break;
        case 40:
          $__5 = true;
          $__6 = $__7;
          $ctx.state = 35;
          $ctx.finallyFallThrough = 39;
          break;
        case 35:
          $ctx.popTry();
          $ctx.state = 46;
          break;
        case 46:
          try {
            if (!$__4 && $__1.return != null) {
              $__1.return();
            }
          } finally {
            if ($__5) {
              throw $__6;
            }
          }
          $ctx.state = 44;
          break;
        case 39:
          $ctx.returnValue = result;
          $ctx.state = -2;
          break;
        case 44:
          $ctx.state = $ctx.finallyFallThrough;
          break;
        default:
          return $ctx.end();
      }
  }, $__10, this);
}));
module.exports = Toolset;

//# sourceMappingURL=toolset.js.map
