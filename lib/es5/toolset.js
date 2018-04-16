"use strict";
var Bluebird = require("bluebird");
var async = Bluebird.coroutine;
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
  if (this.options.target) {
    this.log.info("TOOL", "Building only the " + this.options.target + " target, as specified from the command line.");
  }
};
Toolset.prototype._setupGNUStd = function(install) {
  if (this.options.std) {
    if (this.options.std !== "c++98") {
      if (install) {
        this.log.info("TOOL", ("Using " + this.options.std + " compiler standard."));
      }
      this.compilerFlags.push("-std=" + this.options.std);
    }
  } else {
    if (install) {
      this.log.info("TOOL", "Using c++11 compiler standard.");
    }
    this.compilerFlags.push("-std=c++11");
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
          $ctx.state = 41;
          break;
        case 41:
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
          $ctx.state = 43;
          break;
        case 43:
          $ctx.pushTry(25, 26);
          $ctx.state = 28;
          break;
        case 28:
          $__2 = void 0, $__1 = (list)[Symbol.iterator]();
          $ctx.state = 24;
          break;
        case 24:
          $ctx.state = (!($__4 = ($__2 = $__1.next()).done)) ? 20 : 22;
          break;
        case 12:
          $__4 = true;
          $ctx.state = 24;
          break;
        case 20:
          gen = $__2.value;
          $ctx.state = 21;
          break;
        case 21:
          found = /^visual studio (\d+)/i.exec(gen);
          $ctx.state = 19;
          break;
        case 19:
          $ctx.state = (found) ? 15 : 12;
          break;
        case 15:
          ver = parseInt(found[1]);
          $ctx.state = 16;
          break;
        case 16:
          $ctx.state = (ver > maxVer) ? 9 : 12;
          break;
        case 9:
          $__11 = vsDetect.isInstalled;
          $__12 = $__11.call(vsDetect, ver + ".0");
          $ctx.state = 10;
          break;
        case 10:
          $ctx.state = 6;
          return $__12;
        case 6:
          $__13 = $ctx.sent;
          $ctx.state = 8;
          break;
        case 8:
          $ctx.state = ($__13) ? 11 : 12;
          break;
        case 11:
          result = this.targetOptions.isX64 ? (gen + " Win64") : gen;
          maxVer = ver;
          $ctx.state = 12;
          break;
        case 22:
          $ctx.popTry();
          $ctx.state = 26;
          $ctx.finallyFallThrough = 30;
          break;
        case 25:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          $__7 = $ctx.storedException;
          $ctx.state = 31;
          break;
        case 31:
          $__5 = true;
          $__6 = $__7;
          $ctx.state = 26;
          $ctx.finallyFallThrough = 30;
          break;
        case 26:
          $ctx.popTry();
          $ctx.state = 37;
          break;
        case 37:
          try {
            if (!$__4 && $__1.return != null) {
              $__1.return();
            }
          } finally {
            if ($__5) {
              throw $__6;
            }
          }
          $ctx.state = 35;
          break;
        case 30:
          $ctx.returnValue = result;
          $ctx.state = -2;
          break;
        case 35:
          $ctx.state = $ctx.finallyFallThrough;
          break;
        default:
          return $ctx.end();
      }
  }, $__10, this);
}));
module.exports = Toolset;

//# sourceMappingURL=toolset.js.map
