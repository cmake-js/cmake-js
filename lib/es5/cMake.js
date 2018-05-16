"use strict";
var splitargs = require("splitargs");
var which = require("which");
var Bluebird = require("bluebird");
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var environment = require("./environment");
var Dist = require("./dist");
var CMLog = require("./cmLog");
var vsDetect = require("./vsDetect");
var TargetOptions = require("./targetOptions");
var processHelpers = require("./processHelpers");
var locateNAN = require("./locateNAN");
var npmConfigData = require("rc")("npm");
var async = Bluebird.coroutine;
var Toolset = require("./toolset");
function CMake(options) {
  this.options = options || {};
  this.log = new CMLog(this.options);
  this.dist = new Dist(this.options);
  this.projectRoot = path.resolve(this.options.directory || process.cwd());
  this.workDir = this.options.out || path.join(this.projectRoot, "build");
  this.config = this.options.debug ? "Debug" : "Release";
  this.buildDir = path.join(this.workDir, this.config);
  this._isAvailable = null;
  this.targetOptions = new TargetOptions(this.options);
  this.toolset = new Toolset(this.options);
  this.cMakeOptions = this.options.cMakeOptions || {};
  this.silent = !!options.silent;
}
Object.defineProperties(CMake.prototype, {
  path: {get: function() {
      return this.options.cmakePath || "cmake";
    }},
  isAvailable: {get: function() {
      if (this._isAvailable === null) {
        this._isAvailable = CMake.isAvailable(this.options);
      }
      return this._isAvailable;
    }}
});
CMake.isAvailable = function(options) {
  options = options || {};
  try {
    if (options.cmakePath) {
      var stat = fs.lstatSync(options.cmakePath);
      return !stat.isDirectory();
    } else {
      which.sync("cmake");
      return true;
    }
  } catch (e) {
    _.noop(e);
  }
  return false;
};
CMake.getGenerators = async($traceurRuntime.initGeneratorFunction(function $__16(options) {
  var arch,
      gens,
      stdout,
      hasCr,
      output,
      on;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          arch = " [arch]";
          options = options || {};
          gens = [];
          $ctx.state = 11;
          break;
        case 11:
          $ctx.state = (CMake.isAvailable(options)) ? 1 : 6;
          break;
        case 1:
          $ctx.state = 2;
          return processHelpers.exec((options.cmakePath || "cmake") + " --help");
        case 2:
          stdout = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          hasCr = stdout.includes("\r\n");
          output = hasCr ? stdout.split("\r\n") : stdout.split("\n");
          on = false;
          output.forEach(function(line, i) {
            if (on) {
              var parts = line.split("=");
              if ((parts.length === 2 && parts[0].trim()) || (parts.length === 1 && i !== output.length - 1 && output[i + 1].trim()[0] === "=")) {
                var gen = parts[0].trim();
                if (_.endsWith(gen, arch)) {
                  gen = gen.substr(0, gen.length - arch.length);
                }
                gens.push(gen);
              }
            }
            if (line.trim() === "Generators") {
              on = true;
            }
          });
          $ctx.state = 6;
          break;
        case 6:
          $ctx.returnValue = gens;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__16, this);
}));
CMake.prototype.getGenerators = function() {
  return CMake.getGenerators(this.options);
};
CMake.prototype.verifyIfAvailable = function() {
  if (!this.isAvailable) {
    throw new Error("CMake executable is not found. Please use your system's package manager to install it, or you can get installers from there: http://cmake.org.");
  }
};
CMake.prototype.getConfigureCommand = async($traceurRuntime.initGeneratorFunction(function $__17() {
  var $__1,
      command,
      D,
      incPaths,
      nodeH,
      v8H,
      uvH,
      nanH,
      libs,
      $__5,
      $__6,
      $__7,
      $__3,
      $__2,
      k,
      $__12,
      $__13,
      $__14,
      $__10,
      $__9,
      key,
      ukey,
      s,
      sk;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          command = this.path;
          command += " \"" + this.projectRoot + "\" --no-warn-unused-cli";
          D = [];
          D.push({"CMAKE_JS_VERSION": environment.moduleVersion});
          D.push({"CMAKE_BUILD_TYPE": this.config});
          if (environment.isWin) {
            D.push({"CMAKE_RUNTIME_OUTPUT_DIRECTORY": this.workDir});
          } else {
            D.push({"CMAKE_LIBRARY_OUTPUT_DIRECTORY": this.buildDir});
          }
          if (this.dist.headerOnly) {
            incPaths = [path.join(this.dist.internalPath, "/include/node")];
          } else {
            nodeH = path.join(this.dist.internalPath, "/src");
            v8H = path.join(this.dist.internalPath, "/deps/v8/include");
            uvH = path.join(this.dist.internalPath, "/deps/uv/include");
            incPaths = [nodeH, v8H, uvH];
          }
          $ctx.state = 12;
          break;
        case 12:
          $ctx.state = 2;
          return locateNAN(this.projectRoot);
        case 2:
          nanH = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          if (nanH) {
            incPaths.push(nanH);
          }
          D.push({"CMAKE_JS_INC": incPaths.join(";")});
          D.push({"NODE_RUNTIME": this.targetOptions.runtime});
          D.push({"NODE_RUNTIMEVERSION": this.targetOptions.runtimeVersion});
          D.push({"NODE_ARCH": this.targetOptions.arch});
          if (environment.isWin) {
            libs = this.dist.winLibs;
            if (libs.length) {
              D.push({"CMAKE_JS_LIB": libs.join(";")});
            }
          }
          $__5 = true;
          $__6 = false;
          $__7 = undefined;
          try {
            for ($__3 = void 0, $__2 = (_.keys(this.cMakeOptions))[Symbol.iterator](); !($__5 = ($__3 = $__2.next()).done); $__5 = true) {
              k = $__3.value;
              {
                D.push(($__1 = {}, Object.defineProperty($__1, k, {
                  value: this.cMakeOptions[k],
                  configurable: true,
                  enumerable: true,
                  writable: true
                }), $__1));
              }
            }
          } catch ($__8) {
            $__6 = true;
            $__7 = $__8;
          } finally {
            try {
              if (!$__5 && $__2.return != null) {
                $__2.return();
              }
            } finally {
              if ($__6) {
                throw $__7;
              }
            }
          }
          $ctx.state = 14;
          break;
        case 14:
          $ctx.state = 6;
          return this.toolset.initialize(false);
        case 6:
          $ctx.maybeThrow();
          $ctx.state = 8;
          break;
        case 8:
          if (this.toolset.generator) {
            command += " -G\"" + this.toolset.generator + "\"";
          }
          if (this.toolset.toolset) {
            command += " -T\"" + this.toolset.toolset + "\"";
          }
          if (this.toolset.cppCompilerPath) {
            D.push({"CMAKE_CXX_COMPILER": this.toolset.cppCompilerPath});
          }
          if (this.toolset.cCompilerPath) {
            D.push({"CMAKE_C_COMPILER": this.toolset.cCompilerPath});
          }
          if (this.toolset.compilerFlags.length) {
            D.push({"CMAKE_CXX_FLAGS": this.toolset.compilerFlags.join(" ")});
          }
          if (this.toolset.linkerFlags.length) {
            D.push({"CMAKE_SHARED_LINKER_FLAGS": this.toolset.linkerFlags.join(" ")});
          }
          if (this.toolset.makePath) {
            D.push({"CMAKE_MAKE_PROGRAM": this.toolset.makePath});
          }
          $__12 = true;
          $__13 = false;
          $__14 = undefined;
          try {
            for ($__10 = void 0, $__9 = (_.keys(npmConfigData))[Symbol.iterator](); !($__12 = ($__10 = $__9.next()).done); $__12 = true) {
              key = $__10.value;
              {
                ukey = key.toUpperCase();
                if (_.startsWith(ukey, "CMAKE_")) {
                  s = {};
                  sk = ukey.substr(6);
                  if (sk) {
                    s[sk] = npmConfigData[key];
                    if (s[sk]) {
                      D.push(s);
                    }
                  }
                }
              }
            }
          } catch ($__15) {
            $__13 = true;
            $__14 = $__15;
          } finally {
            try {
              if (!$__12 && $__9.return != null) {
                $__9.return();
              }
            } finally {
              if ($__13) {
                throw $__14;
              }
            }
          }
          command += " " + D.map(function(p) {
            return "-D" + _.keys(p)[0] + "=\"" + _.values(p)[0] + "\"";
          }).join(" ");
          $ctx.state = 16;
          break;
        case 16:
          $ctx.returnValue = command;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__17, this);
}));
CMake.prototype.configure = async($traceurRuntime.initGeneratorFunction(function $__18() {
  var listPath,
      command,
      cwd,
      e;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          this.verifyIfAvailable();
          this.log.info("CMD", "CONFIGURE");
          listPath = path.join(this.projectRoot, "CMakeLists.txt");
          $ctx.state = 44;
          break;
        case 44:
          $ctx.state = 2;
          return this.getConfigureCommand();
        case 2:
          command = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.pushTry(9, null);
          $ctx.state = 12;
          break;
        case 12:
          $ctx.state = 6;
          return fs.lstat(listPath);
        case 6:
          $ctx.maybeThrow();
          $ctx.state = 8;
          break;
        case 8:
          $ctx.popTry();
          $ctx.state = 14;
          break;
        case 9:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 15;
          break;
        case 15:
          throw new Error("'" + listPath + "' not found.");
          $ctx.state = 14;
          break;
        case 14:
          $ctx.pushTry(22, null);
          $ctx.state = 25;
          break;
        case 25:
          $ctx.state = 19;
          return fs.ensureDir(this.workDir);
        case 19:
          $ctx.maybeThrow();
          $ctx.state = 21;
          break;
        case 21:
          $ctx.popTry();
          $ctx.state = 27;
          break;
        case 22:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 28;
          break;
        case 28:
          _.noop(e);
          $ctx.state = 27;
          break;
        case 27:
          cwd = process.cwd();
          process.chdir(this.workDir);
          $ctx.state = 46;
          break;
        case 46:
          $ctx.pushTry(null, 36);
          $ctx.state = 38;
          break;
        case 38:
          $ctx.state = 32;
          return this._run(command);
        case 32:
          $ctx.maybeThrow();
          $ctx.state = 36;
          $ctx.finallyFallThrough = -2;
          break;
        case 36:
          $ctx.popTry();
          $ctx.state = 42;
          break;
        case 42:
          process.chdir(cwd);
          $ctx.state = 40;
          break;
        case 40:
          $ctx.state = $ctx.finallyFallThrough;
          break;
        default:
          return $ctx.end();
      }
  }, $__18, this);
}));
CMake.prototype.ensureConfigured = async($traceurRuntime.initGeneratorFunction(function $__19() {
  var e;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.pushTry(11, null);
          $ctx.state = 14;
          break;
        case 14:
          $ctx.state = 2;
          return fs.lstat(path.join(this.workDir, "CMakeCache.txt"));
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.popTry();
          $ctx.state = -2;
          break;
        case 11:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 9;
          break;
        case 9:
          _.noop(e);
          $ctx.state = 10;
          break;
        case 10:
          $ctx.state = 6;
          return this.configure();
        case 6:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__19, this);
}));
CMake.prototype.getBuildCommand = function() {
  var command = this.path + " --build \"" + this.workDir + "\" --config " + this.config;
  if (this.options.target) {
    command += " --target " + this.options.target;
  }
  return Bluebird.resolve(command);
};
CMake.prototype.build = async($traceurRuntime.initGeneratorFunction(function $__20() {
  var buildCommand;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          this.verifyIfAvailable();
          $ctx.state = 14;
          break;
        case 14:
          $ctx.state = 2;
          return this.ensureConfigured();
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = 6;
          return this.getBuildCommand();
        case 6:
          buildCommand = $ctx.sent;
          $ctx.state = 8;
          break;
        case 8:
          this.log.info("CMD", "BUILD");
          $ctx.state = 16;
          break;
        case 16:
          $ctx.state = 10;
          return this._run(buildCommand);
        case 10:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__20, this);
}));
CMake.prototype.getCleanCommand = function() {
  return this.path + " -E remove_directory \"" + this.workDir + "\"";
};
CMake.prototype.clean = function() {
  this.verifyIfAvailable();
  this.log.info("CMD", "CLEAN");
  return this._run(this.getCleanCommand());
};
CMake.prototype.reconfigure = async($traceurRuntime.initGeneratorFunction(function $__21() {
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = 2;
          return this.clean();
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = 6;
          return this.configure();
        case 6:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__21, this);
}));
CMake.prototype.rebuild = async($traceurRuntime.initGeneratorFunction(function $__22() {
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = 2;
          return this.clean();
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = 6;
          return this.build();
        case 6:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__22, this);
}));
CMake.prototype.compile = async($traceurRuntime.initGeneratorFunction(function $__23() {
  var e;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.pushTry(11, null);
          $ctx.state = 14;
          break;
        case 14:
          $ctx.state = 2;
          return this.build();
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.popTry();
          $ctx.state = -2;
          break;
        case 11:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 9;
          break;
        case 9:
          _.noop(e);
          this.log.info("REP", "Build has been failed, trying to do a full rebuild.");
          $ctx.state = 10;
          break;
        case 10:
          $ctx.state = 6;
          return this.rebuild();
        case 6:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__23, this);
}));
CMake.prototype._run = function(command) {
  this.log.info("RUN", command);
  return processHelpers.run(command, {silent: this.silent});
};
module.exports = CMake;

//# sourceMappingURL=cMake.js.map
