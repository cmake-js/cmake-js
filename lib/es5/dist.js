"use strict";
var environment = require("./environment");
var path = require("path");
var urljoin = require("url-join");
var Bluebird = require("bluebird");
var fs = require("fs-extra");
var _ = require("lodash");
var CMLog = require("./cmLog");
var TargetOptions = require("./targetOptions");
var runtimePaths = require("./runtimePaths");
var async = Bluebird.coroutine;
var Downloader = require("./downloader");
function testSum(sums, sum, fPath) {
  var serverSum = _.first(sums.filter(function(s) {
    return s.getPath === fPath;
  }));
  if (serverSum && serverSum.sum === sum) {
    return;
  }
  throw new Error("SHA sum of file '" + fPath + "' mismatch!");
}
function Dist(options) {
  this.options = options || {};
  this.log = new CMLog(this.options);
  this.targetOptions = new TargetOptions(this.options);
  this.downloader = new Downloader(this.options);
}
Object.defineProperties(Dist.prototype, {
  internalPath: {get: function() {
      return path.join(environment.home, ".cmake-js", (this.targetOptions.runtime) + "-" + this.targetOptions.arch, "v" + this.targetOptions.runtimeVersion);
    }},
  externalPath: {get: function() {
      return runtimePaths.get(this.targetOptions).externalPath;
    }},
  downloaded: {get: function() {
      var headers = false;
      var libs = true;
      var stat = getStat(this.internalPath);
      if (stat.isDirectory()) {
        if (this.headerOnly) {
          stat = getStat(path.join(this.internalPath, "include/node/node.h"));
          headers = stat.isFile();
        } else {
          stat = getStat(path.join(this.internalPath, "src/node.h"));
          if (stat.isFile()) {
            stat = getStat(path.join(this.internalPath, "deps/v8/include/v8.h"));
            headers = stat.isFile();
          }
        }
        if (environment.isWin) {
          var $__5 = true;
          var $__6 = false;
          var $__7 = undefined;
          try {
            for (var $__3 = void 0,
                $__2 = (this.winLibs)[Symbol.iterator](); !($__5 = ($__3 = $__2.next()).done); $__5 = true) {
              var libPath = $__3.value;
              {
                stat = getStat(libPath);
                libs = libs && stat.isFile();
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
        }
      }
      return headers && libs;
      function getStat(path) {
        try {
          return fs.statSync(path);
        } catch (e) {
          return {
            isFile: _.constant(false),
            isDirectory: _.constant(false)
          };
        }
      }
    }},
  winLibs: {get: function() {
      var libs = runtimePaths.get(this.targetOptions).winLibs;
      var result = [];
      var $__5 = true;
      var $__6 = false;
      var $__7 = undefined;
      try {
        for (var $__3 = void 0,
            $__2 = (libs)[Symbol.iterator](); !($__5 = ($__3 = $__2.next()).done); $__5 = true) {
          var lib = $__3.value;
          {
            result.push(path.join(this.internalPath, lib.dir, lib.name));
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
      return result;
    }},
  headerOnly: {get: function() {
      return runtimePaths.get(this.targetOptions).headerOnly;
    }}
});
Dist.prototype.ensureDownloaded = async($traceurRuntime.initGeneratorFunction(function $__9() {
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = (!this.downloaded) ? 1 : -2;
          break;
        case 1:
          $ctx.state = 2;
          return this.download();
        case 2:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__9, this);
}));
Dist.prototype.download = async($traceurRuntime.initGeneratorFunction(function $__10() {
  var log,
      sums;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          log = this.log;
          log.info("DIST", "Downloading distribution files.");
          $ctx.state = 14;
          break;
        case 14:
          $ctx.state = 2;
          return fs.ensureDir(this.internalPath);
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = 6;
          return this._downloadShaSums();
        case 6:
          sums = $ctx.sent;
          $ctx.state = 8;
          break;
        case 8:
          $ctx.state = 10;
          return Bluebird.all([this._downloadLibs(sums), this._downloadTar(sums)]);
        case 10:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__10, this);
}));
Dist.prototype._downloadShaSums = async($traceurRuntime.initGeneratorFunction(function $__11() {
  var sumUrl,
      log,
      $__12,
      $__13,
      $__14,
      $__15,
      $__16,
      $__17,
      $__18,
      $__19,
      $__20,
      $__21,
      $__22,
      $__23;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = (this.targetOptions.runtime === "node" || this.targetOptions.runtime === "iojs") ? 11 : 13;
          break;
        case 11:
          sumUrl = urljoin(this.externalPath, "SHASUMS256.txt");
          log = this.log;
          log.http("DIST", "\t- " + sumUrl);
          $ctx.state = 12;
          break;
        case 12:
          $__12 = this.downloader;
          $__13 = $__12.downloadString;
          $__14 = $__13.call($__12, sumUrl);
          $ctx.state = 6;
          break;
        case 6:
          $ctx.state = 2;
          return $__14;
        case 2:
          $__15 = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $__16 = $__15.split;
          $__17 = $__16.call($__15, "\n");
          $__18 = $__17.map;
          $__19 = function(line) {
            var parts = line.split(/\s+/);
            return {
              getPath: parts[1],
              sum: parts[0]
            };
          };
          $__20 = $__18.call($__17, $__19);
          $__21 = $__20.filter;
          $__22 = function(i) {
            return i.getPath && i.sum;
          };
          $__23 = $__21.call($__20, $__22);
          $ctx.state = 8;
          break;
        case 8:
          $ctx.returnValue = $__23;
          $ctx.state = -2;
          break;
        case 13:
          $ctx.returnValue = null;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__11, this);
}));
Dist.prototype._downloadTar = async($traceurRuntime.initGeneratorFunction(function $__24(sums) {
  var log,
      self,
      tarLocalPath,
      tarUrl,
      sum;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          log = this.log;
          self = this;
          tarLocalPath = runtimePaths.get(self.targetOptions).tarPath;
          tarUrl = urljoin(self.externalPath, tarLocalPath);
          log.http("DIST", "\t- " + tarUrl);
          $ctx.state = 6;
          break;
        case 6:
          $ctx.state = 2;
          return this.downloader.downloadTgz(tarUrl, {
            hash: sums ? "sha256" : null,
            cwd: self.internalPath,
            strip: 1,
            filter: function(entryPath) {
              if (entryPath === self.internalPath) {
                return true;
              }
              var ext = path.extname(entryPath);
              return ext && ext.toLowerCase() === ".h";
            }
          });
        case 2:
          sum = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          if (sums) {
            testSum(sums, sum, tarLocalPath);
          }
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__24, this);
}));
Dist.prototype._downloadLibs = async($traceurRuntime.initGeneratorFunction(function $__25(sums) {
  var log,
      self,
      paths,
      $__5,
      $__6,
      $__7,
      $__3,
      $__2,
      dirs,
      subDir,
      fn,
      fPath,
      libUrl,
      sum,
      $__8;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          log = this.log;
          self = this;
          $ctx.state = 35;
          break;
        case 35:
          $ctx.state = (!environment.isWin) ? 1 : 2;
          break;
        case 1:
          $ctx.state = -2;
          break;
        case 2:
          paths = runtimePaths.get(self.targetOptions);
          $__5 = true;
          $__6 = false;
          $__7 = undefined;
          $ctx.state = 37;
          break;
        case 37:
          $ctx.pushTry(21, 22);
          $ctx.state = 24;
          break;
        case 24:
          $__3 = void 0, $__2 = (paths.winLibs)[Symbol.iterator]();
          $ctx.state = 20;
          break;
        case 20:
          $ctx.state = (!($__5 = ($__3 = $__2.next()).done)) ? 16 : 18;
          break;
        case 15:
          $__5 = true;
          $ctx.state = 20;
          break;
        case 16:
          dirs = $__3.value;
          $ctx.state = 17;
          break;
        case 17:
          subDir = dirs.dir;
          fn = dirs.name;
          fPath = subDir ? urljoin(subDir, fn) : fn;
          libUrl = urljoin(self.externalPath, fPath);
          log.http("DIST", "\t- " + libUrl);
          $ctx.state = 13;
          break;
        case 13:
          $ctx.state = 5;
          return fs.ensureDir(path.join(self.internalPath, subDir));
        case 5:
          $ctx.maybeThrow();
          $ctx.state = 7;
          break;
        case 7:
          $ctx.state = 9;
          return this.downloader.downloadFile(libUrl, {
            path: path.join(self.internalPath, fPath),
            hash: sums ? "sha256" : null
          });
        case 9:
          sum = $ctx.sent;
          $ctx.state = 11;
          break;
        case 11:
          if (sums) {
            testSum(sums, sum, fPath);
          }
          $ctx.state = 15;
          break;
        case 18:
          $ctx.popTry();
          $ctx.state = 22;
          $ctx.finallyFallThrough = -2;
          break;
        case 21:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          $__8 = $ctx.storedException;
          $ctx.state = 27;
          break;
        case 27:
          $__6 = true;
          $__7 = $__8;
          $ctx.state = 22;
          $ctx.finallyFallThrough = -2;
          break;
        case 22:
          $ctx.popTry();
          $ctx.state = 33;
          break;
        case 33:
          try {
            if (!$__5 && $__2.return != null) {
              $__2.return();
            }
          } finally {
            if ($__6) {
              throw $__7;
            }
          }
          $ctx.state = 31;
          break;
        case 31:
          $ctx.state = $ctx.finallyFallThrough;
          break;
        default:
          return $ctx.end();
      }
  }, $__25, this);
}));
module.exports = Dist;

//# sourceMappingURL=dist.js.map
