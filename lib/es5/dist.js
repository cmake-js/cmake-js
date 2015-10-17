"use strict";
var environment = require("./environment");
var path = require("path");
var urljoin = require("url-join");
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var MemoryStream = require("memory-stream");
var request = require("request");
var zlib = require("zlib");
var tar = require("tar");
var crypto = require("crypto");
var _ = require("lodash");
var CMLog = require("./cmLog");
var TargetOptions = require("./targetOptions");
var runtimePaths = require("./runtimePaths");
var async = Bluebird.coroutine;
function downloadTo(url, result, calculateSum) {
  var shasum = calculateSum ? crypto.createHash('sha256') : null;
  return new Bluebird(function(resolve, reject) {
    request.get(url).on('error', function(err) {
      reject(err);
    }).on('data', function(chunk) {
      if (shasum) {
        shasum.update(chunk);
      }
    }).pipe(result);
    result.once("finish", function() {
      resolve(shasum ? shasum.digest('hex') : undefined);
    });
  });
}
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
  var result,
      sumUrl,
      log;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = (this.targetOptions.runtime === "node" || this.targetOptions.runtime === "iojs") ? 7 : 9;
          break;
        case 7:
          result = new MemoryStream();
          sumUrl = urljoin(this.externalPath, "SHASUMS256.txt");
          log = this.log;
          log.http("DIST", "\t- " + sumUrl);
          $ctx.state = 8;
          break;
        case 8:
          $ctx.state = 2;
          return downloadTo(sumUrl, result, false);
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.returnValue = result.toString().split("\n").map(function(line) {
            var parts = line.split(/\s+/);
            return {
              getPath: parts[1],
              sum: parts[0]
            };
          }).filter(function(i) {
            return i.getPath && i.sum;
          });
          $ctx.state = -2;
          break;
        case 9:
          $ctx.returnValue = null;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__3, this);
}));
Dist.prototype._downloadTar = function(sums) {
  var log = this.log;
  var self = this;
  var gunzip = zlib.createGunzip();
  var extracter = new tar.Extract({
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
  var tarLocalPath = runtimePaths.get(self.targetOptions).tarPath;
  var tarUrl = urljoin(self.externalPath, tarLocalPath);
  log.http("DIST", "\t- " + tarUrl);
  return new Bluebird(function(resolve, reject) {
    var shasum = crypto.createHash('sha256');
    extracter.once("end", function() {
      try {
        if (sums) {
          testSum(sums, shasum.digest('hex'), tarLocalPath);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    extracter.once("error", function(err) {
      reject(err);
    });
    request.get(tarUrl).on('error', function(err) {
      reject(err);
    }).on('data', function(chunk) {
      shasum.update(chunk);
    }).pipe(gunzip).pipe(extracter);
  });
};
Dist.prototype._downloadLib = async($traceurRuntime.initGeneratorFunction(function $__4(sums) {
  var log,
      self,
      paths,
      subDir,
      fn,
      fPath,
      libUrl,
      result,
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
          result = fs.createWriteStream(path.join(self.internalPath, fPath));
          $ctx.state = 17;
          break;
        case 17:
          $ctx.state = 9;
          return downloadTo(libUrl, result, true);
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
  }, $__4, this);
}));
module.exports = Dist;

//# sourceMappingURL=dist.js.map
