"use strict";
var environment = require("./environment");
var path = require("path");
var urljoin = require("url-join");
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
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
      var result = false;
      try {
        var stat = fs.lstatSync(this.internalPath);
        if (stat.isDirectory()) {
          if (this.headerOnly) {
            stat = fs.lstatSync(path.join(this.internalPath, "include/node/node.h"));
            result = !stat.isDirectory();
          } else {
            stat = fs.lstatSync(path.join(this.internalPath, "src/node.h"));
            if (!stat.isDirectory()) {
              stat = fs.lstatSync(path.join(this.internalPath, "deps/v8/include/v8.h"));
              result = !stat.isDirectory();
            }
          }
        }
      } catch (e) {
        _.noop(e);
      }
      return result;
    }},
  winLibDir: {get: function() {
      return path.join(this.internalPath, runtimePaths.get(this.targetOptions).winLibDir);
    }},
  winLibPath: {get: function() {
      return path.join(this.winLibDir, runtimePaths.get(this.targetOptions).winLibName);
    }},
  headerOnly: {get: function() {
      return runtimePaths.get(this.targetOptions).headerOnly;
    }}
});
Dist.prototype.ensureDownloaded = async($traceurRuntime.initGeneratorFunction(function $__1() {
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
  }, $__1, this);
}));
Dist.prototype.download = async($traceurRuntime.initGeneratorFunction(function $__2() {
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
          return fs.mkdirpAsync(this.internalPath);
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
          return Bluebird.all([this._downloadLib(sums), this._downloadTar(sums)]);
        case 10:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__2, this);
}));
Dist.prototype._downloadShaSums = async($traceurRuntime.initGeneratorFunction(function $__3() {
  var sumUrl,
      log,
      $__4,
      $__5,
      $__6,
      $__7,
      $__8,
      $__9,
      $__10,
      $__11,
      $__12,
      $__13,
      $__14,
      $__15;
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
          $__4 = this.downloader;
          $__5 = $__4.downloadString;
          $__6 = $__5.call($__4, sumUrl);
          $ctx.state = 6;
          break;
        case 6:
          $ctx.state = 2;
          return $__6;
        case 2:
          $__7 = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $__8 = $__7.split;
          $__9 = $__8.call($__7, "\n");
          $__10 = $__9.map;
          $__11 = function(line) {
            var parts = line.split(/\s+/);
            return {
              getPath: parts[1],
              sum: parts[0]
            };
          };
          $__12 = $__10.call($__9, $__11);
          $__13 = $__12.filter;
          $__14 = function(i) {
            return i.getPath && i.sum;
          };
          $__15 = $__13.call($__12, $__14);
          $ctx.state = 8;
          break;
        case 8:
          $ctx.returnValue = $__15;
          $ctx.state = -2;
          break;
        case 13:
          $ctx.returnValue = null;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__3, this);
}));
Dist.prototype._downloadTar = async($traceurRuntime.initGeneratorFunction(function $__16(sums) {
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
            path: self.internalPath,
            strip: 1,
            filter: function() {
              if (this.path === self.internalPath) {
                return true;
              }
              var ext = path.extname(this.path);
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
  }, $__16, this);
}));
Dist.prototype._downloadLib = async($traceurRuntime.initGeneratorFunction(function $__17(sums) {
  var log,
      self,
      paths,
      subDir,
      fn,
      fPath,
      libUrl,
      sum;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          log = this.log;
          self = this;
          $ctx.state = 13;
          break;
        case 13:
          $ctx.state = (!environment.isWin) ? 1 : 2;
          break;
        case 1:
          $ctx.state = -2;
          break;
        case 2:
          paths = runtimePaths.get(self.targetOptions);
          subDir = paths.winLibDir;
          fn = paths.winLibName;
          fPath = subDir ? urljoin(subDir, fn) : fn;
          libUrl = urljoin(self.externalPath, fPath);
          log.http("DIST", "\t- " + libUrl);
          $ctx.state = 15;
          break;
        case 15:
          $ctx.state = 5;
          return fs.mkdirpAsync(path.join(self.internalPath, subDir));
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
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__17, this);
}));
module.exports = Dist;

//# sourceMappingURL=dist.js.map
