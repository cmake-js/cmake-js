"use strict";
var splitargs = require('splitargs');
var which = require("which");
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var path = require("path");
var _ = require("lodash");
var environment = require("./environment");
var Dist = require("./dist");
var CMLog = require("./cmLog");
var vsDetect = require("./vsDetect");
var TargetOptions = require("./targetOptions");
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var locateNAN = require("./locateNAN");
var npmconf = Bluebird.promisifyAll(require("npmconf"));
var async = Bluebird.coroutine;
function CMake(options) {
  this.options = options || {};
  this.log = new CMLog(this.options);
  this.dist = new Dist(this.options);
  this.projectRoot = path.resolve(this.options.directory || process.cwd());
  this.workDir = path.join(this.projectRoot, "build");
  this.config = this.options.debug ? "Debug" : "Release";
  this.buildDir = path.join(this.workDir, this.config);
  this._isAvailable = null;
  this.targetOptions = new TargetOptions(this.options);
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
CMake.getGenerators = function(options) {
  var arch = " [arch]";
  options = options || {};
  return new Bluebird(function(resolve, reject) {
    var gens = [];
    if (CMake.isAvailable(options)) {
      exec((options.cmakePath || "cmake") + " --help", function(err, stdout, stderr) {
        if (err) {
          reject(new Error(err.message + "\n" + stdout));
        } else {
          try {
            var output = environment.isWin ? stdout.split("\r\n") : stdout.split("\n");
            var on = false;
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
          } catch (e) {
            reject(e);
            return;
          }
          resolve(gens);
        }
      });
    } else {
      resolve(gens);
    }
  });
};
CMake.prototype.getGenerators = function() {
  return CMake.getGenerators(this.options);
};
CMake.prototype.verifyIfAvailable = function() {
  if (!this.isAvailable) {
    throw new Error("CMake executable is not found. Please use your system's package manager to install it, or you can get installers from there: http://cmake.org.");
  }
};
CMake.prototype.getConfigureCommand = async($traceurRuntime.initGeneratorFunction(function $__23() {
  var vsGeneratorOverride,
      list,
      tasks,
      maxVer,
      $__4,
      $__5,
      $__6,
      $__22,
      $__2,
      $__1,
      userConfig,
      npmConfig,
      npmConfigData,
      $__11,
      $__12,
      $__13,
      $__9,
      $__8,
      key,
      ukey,
      s,
      sk,
      useNinja,
      useXcode,
      command,
      D,
      incPaths,
      nodeH,
      v8H,
      uvH,
      nanH,
      cxxFlags,
      $__18,
      $__19,
      $__20,
      $__16,
      $__15,
      uc,
      $__25,
      $__26,
      $__7;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = (environment.isWin && this.targetOptions.isX64) ? 1 : 38;
          break;
        case 1:
          $ctx.state = 2;
          return this.getGenerators();
        case 2:
          list = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          tasks = [];
          maxVer = 0;
          $__4 = true;
          $__5 = false;
          $__6 = undefined;
          $ctx.state = 40;
          break;
        case 40:
          $ctx.pushTry(22, 23);
          $ctx.state = 25;
          break;
        case 25:
          $__22 = $traceurRuntime.initGeneratorFunction(function $__24() {
            var gen,
                found,
                ver;
            return $traceurRuntime.createGeneratorInstance(function($ctx) {
              while (true)
                switch ($ctx.state) {
                  case 0:
                    gen = $__2.value;
                    {
                      found = /^visual studio (\d+)/i.exec(gen);
                      if (found) {
                        ver = parseInt(found[1]);
                        if (ver > maxVer) {
                          tasks.push(vsDetect.isInstalled(ver + ".0").then(function(installed) {
                            if (installed && ver > maxVer) {
                              vsGeneratorOverride = "-G\"" + gen + " Win64\"";
                              maxVer = ver;
                            }
                          }));
                        }
                      }
                    }
                    $ctx.state = -2;
                    break;
                  default:
                    return $ctx.end();
                }
            }, $__24, this);
          });
          $ctx.state = 21;
          break;
        case 21:
          $__2 = void 0, $__1 = (list)[Symbol.iterator]();
          $ctx.state = 19;
          break;
        case 19:
          $ctx.state = (!($__4 = ($__2 = $__1.next()).done)) ? 15 : 17;
          break;
        case 14:
          $__4 = true;
          $ctx.state = 19;
          break;
        case 15:
          $__25 = $ctx.wrapYieldStar($__22()[Symbol.iterator]());
          $ctx.sent = void 0;
          $ctx.action = 'next';
          $ctx.state = 16;
          break;
        case 16:
          $__26 = $__25[$ctx.action]($ctx.sentIgnoreThrow);
          $ctx.state = 13;
          break;
        case 13:
          $ctx.state = ($__26.done) ? 7 : 6;
          break;
        case 7:
          $ctx.sent = $__26.value;
          $ctx.state = 14;
          break;
        case 6:
          $ctx.state = 16;
          return $__26.value;
        case 17:
          $ctx.popTry();
          $ctx.state = 23;
          $ctx.finallyFallThrough = 27;
          break;
        case 22:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          $__7 = $ctx.storedException;
          $ctx.state = 28;
          break;
        case 28:
          $__5 = true;
          $__6 = $__7;
          $ctx.state = 23;
          $ctx.finallyFallThrough = 27;
          break;
        case 23:
          $ctx.popTry();
          $ctx.state = 34;
          break;
        case 34:
          try {
            if (!$__4 && $__1.return != null) {
              $__1.return();
            }
          } finally {
            if ($__5) {
              throw $__6;
            }
          }
          $ctx.state = 32;
          break;
        case 27:
          $ctx.state = 36;
          return Bluebird.all(tasks);
        case 36:
          $ctx.maybeThrow();
          $ctx.state = 38;
          break;
        case 38:
          userConfig = [];
          $ctx.state = 53;
          break;
        case 53:
          $ctx.state = 43;
          return npmconf.loadAsync();
        case 43:
          npmConfig = $ctx.sent;
          $ctx.state = 45;
          break;
        case 45:
          npmConfigData = {};
          if (npmConfig.sources.global && npmConfig.sources.global.data) {
            _.extend(npmConfigData, npmConfig.sources.global.data);
          }
          if (npmConfig.sources.user && npmConfig.sources.user.data) {
            _.extend(npmConfigData, npmConfig.sources.user.data);
          }
          $__11 = true;
          $__12 = false;
          $__13 = undefined;
          try {
            for ($__9 = void 0, $__8 = (_.keys(npmConfigData))[Symbol.iterator](); !($__11 = ($__9 = $__8.next()).done); $__11 = true) {
              key = $__9.value;
              {
                ukey = key.toUpperCase();
                if (_.startsWith(ukey, "CMAKE_")) {
                  s = {};
                  sk = ukey.substr(6);
                  if (sk) {
                    s[sk] = npmConfigData[key];
                    if (s[sk]) {
                      userConfig.push(s);
                    }
                  }
                }
              }
            }
          } catch ($__14) {
            $__12 = true;
            $__13 = $__14;
          } finally {
            try {
              if (!$__11 && $__8.return != null) {
                $__8.return();
              }
            } finally {
              if ($__12) {
                throw $__13;
              }
            }
          }
          useNinja = !environment.isWin && !this.options.preferMake && environment.isNinjaAvailable;
          useXcode = environment.isOSX && this.options.preferXcode;
          command = this.path;
          command += " \"" + this.projectRoot + "\" --no-warn-unused-cli";
          if (useNinja) {
            command += " -GNinja";
          } else if (vsGeneratorOverride) {
            command += " " + vsGeneratorOverride;
          } else if (useXcode) {
            command += " -GXcode";
          }
          D = [];
          D.push({"CMAKE_BUILD_TYPE": this.config});
          if (!environment.isWin) {
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
          $ctx.state = 55;
          break;
        case 55:
          $ctx.state = 47;
          return locateNAN(this.projectRoot);
        case 47:
          nanH = $ctx.sent;
          $ctx.state = 49;
          break;
        case 49:
          if (nanH) {
            incPaths.push(nanH);
          }
          D.push({"CMAKE_JS_INC": incPaths.join(";")});
          D.push({"NODE_RUNTIME": this.targetOptions.runtime});
          D.push({"NODE_RUNTIMEVERSION": this.targetOptions.runtimeVersion});
          D.push({"NODE_ARCH": this.targetOptions.arch});
          if (environment.isWin) {
            D.push({"CMAKE_JS_LIB": this.dist.winLibPath});
            if (this.targetOptions.isX86) {
              D.push({"CMAKE_SHARED_LINKER_FLAGS": "/SAFESEH:NO"});
            }
          }
          if (environment.isPosix) {
            if (this.options.preferClang && environment.isClangAvailable) {
              D.push({"CMAKE_C_COMPILER": "clang"});
              D.push({"CMAKE_CXX_COMPILER": "clang++"});
            } else if (this.options.preferGnu && environment.isGPPAvailable) {
              D.push({"CMAKE_C_COMPILER": "gcc"});
              D.push({"CMAKE_CXX_COMPILER": "g++"});
            }
          }
          if (environment.isOSX) {
            cxxFlags = "-D_DARWIN_USE_64_BIT_INODE=1 -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64 -DBUILDING_NODE_EXTENSION -w";
            if (!this.options.forceNoC11) {
              cxxFlags += " -std=c++11";
            }
            D.push({"CMAKE_CXX_FLAGS": cxxFlags});
            D.push({"CMAKE_SHARED_LINKER_FLAGS": "-undefined dynamic_lookup"});
          } else if (!environment.isWin) {
            if (!this.options.forceNoC11) {
              D.push({"CMAKE_CXX_FLAGS": "-std=c++11"});
            }
          }
          $__18 = true;
          $__19 = false;
          $__20 = undefined;
          try {
            for ($__16 = void 0, $__15 = (userConfig)[Symbol.iterator](); !($__18 = ($__16 = $__15.next()).done); $__18 = true) {
              uc = $__16.value;
              {
                D.push(uc);
              }
            }
          } catch ($__21) {
            $__19 = true;
            $__20 = $__21;
          } finally {
            try {
              if (!$__18 && $__15.return != null) {
                $__15.return();
              }
            } finally {
              if ($__19) {
                throw $__20;
              }
            }
          }
          command += " " + D.map(function(p) {
            return "-D" + _.keys(p)[0] + "=\"" + _.values(p)[0] + "\"";
          }).join(" ");
          $ctx.state = 57;
          break;
        case 57:
          $ctx.returnValue = command;
          $ctx.state = -2;
          break;
        case 32:
          $ctx.state = $ctx.finallyFallThrough;
          break;
        default:
          return $ctx.end();
      }
  }, $__23, this);
}));
CMake.prototype.configure = async($traceurRuntime.initGeneratorFunction(function $__24() {
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
          return fs.lstatAsync(listPath);
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
          return fs.mkdirAsync(this.workDir);
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
  }, $__24, this);
}));
CMake.prototype.ensureConfigured = async($traceurRuntime.initGeneratorFunction(function $__27() {
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
          return fs.lstatAsync(path.join(this.workDir, "CMakeCache.txt"));
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
  }, $__27, this);
}));
CMake.prototype.getBuildCommand = function() {
  return Bluebird.resolve(this.path + " --build \"" + this.workDir + "\" --config " + this.config);
};
CMake.prototype.build = async($traceurRuntime.initGeneratorFunction(function $__28() {
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
  }, $__28, this);
}));
CMake.prototype.getCleanCommand = function() {
  return this.path + " -E remove_directory \"" + this.workDir + "\"";
};
CMake.prototype.clean = function() {
  this.verifyIfAvailable();
  this.log.info("CMD", "CLEAN");
  return this._run(this.getCleanCommand());
};
CMake.prototype.reconfigure = async($traceurRuntime.initGeneratorFunction(function $__29() {
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
  }, $__29, this);
}));
CMake.prototype.rebuild = async($traceurRuntime.initGeneratorFunction(function $__30() {
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
  }, $__30, this);
}));
CMake.prototype.compile = async($traceurRuntime.initGeneratorFunction(function $__31() {
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
  }, $__31, this);
}));
CMake.prototype._run = function(command) {
  var self = this;
  self.log.info("RUN", command);
  return new Bluebird(function(resolve, reject) {
    var args = splitargs(command);
    var name = args[0];
    args.splice(0, 1);
    var child = spawn(name, args, {stdio: "inherit"});
    var ended = false;
    child.on("error", function(e) {
      if (!ended) {
        reject(e);
        ended = true;
      }
    });
    child.on("exit", function(code, signal) {
      if (!ended) {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error("Process terminated: " + code || signal));
        }
        ended = true;
      }
    });
  });
};
module.exports = CMake;

//# sourceMappingURL=cMake.js.map
