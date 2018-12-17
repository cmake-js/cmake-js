"use strict";
var Promise = require("bluebird");
var crypto = require("crypto");
var request = require("request");
var async = Promise.coroutine;
var MemoryStream = require("memory-stream");
var zlib = require("zlib");
var tar = require("tar");
var fs = require("fs");
var _ = require("lodash");
var unzip = require("unzipper");
var CMLog = require("./cmLog");
function Downloader(options) {
  this.options = options || {};
  this.log = new CMLog(this.options);
}
Downloader.prototype.downloadToStream = function(url, stream, hash) {
  var self = this;
  var shasum = hash ? crypto.createHash(hash) : null;
  return new Promise(function(resolve, reject) {
    var length = 0;
    var done = 0;
    var lastPercent = 0;
    request.get(url).on("error", function(err) {
      reject(err);
    }).on("response", function(data) {
      length = parseInt(data.headers["content-length"]);
      if (!_.isNumber(length)) {
        length = 0;
      }
    }).on("data", function(chunk) {
      if (shasum) {
        shasum.update(chunk);
      }
      if (length) {
        done += chunk.length;
        var percent = done / length * 100;
        percent = Math.round(percent / 10) * 10 + 10;
        if (percent > lastPercent) {
          self.log.verbose("DWNL", "\t" + lastPercent + "%");
          lastPercent = percent;
        }
      }
    }).pipe(stream);
    stream.once("error", function(err) {
      reject(err);
    });
    stream.once("finish", function() {
      resolve(shasum ? shasum.digest("hex") : undefined);
    });
  });
};
Downloader.prototype.downloadString = async($traceurRuntime.initGeneratorFunction(function $__1(url) {
  var result;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          result = new MemoryStream();
          $ctx.state = 8;
          break;
        case 8:
          $ctx.state = 2;
          return this.downloadToStream(url, result);
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.returnValue = result.toString();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__1, this);
}));
Downloader.prototype.downloadFile = async($traceurRuntime.initGeneratorFunction(function $__2(url, options) {
  var result,
      sum;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          if (_.isString(options)) {
            options.path = options;
          }
          result = fs.createWriteStream(options.path);
          $ctx.state = 8;
          break;
        case 8:
          $ctx.state = 2;
          return this.downloadToStream(url, result, options.hash);
        case 2:
          sum = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          this.testSum(url, sum, options);
          $ctx.state = 10;
          break;
        case 10:
          $ctx.returnValue = sum;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__2, this);
}));
Downloader.prototype.downloadTgz = async($traceurRuntime.initGeneratorFunction(function $__3(url, options) {
  var gunzip,
      extractor,
      sum;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          if (_.isString(options)) {
            options.cwd = options;
          }
          gunzip = zlib.createGunzip();
          extractor = tar.extract(options);
          gunzip.pipe(extractor);
          $ctx.state = 8;
          break;
        case 8:
          $ctx.state = 2;
          return this.downloadToStream(url, gunzip, options.hash);
        case 2:
          sum = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          this.testSum(url, sum, options);
          $ctx.state = 10;
          break;
        case 10:
          $ctx.returnValue = sum;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__3, this);
}));
Downloader.prototype.downloadZip = async($traceurRuntime.initGeneratorFunction(function $__4(url, options) {
  var extractor,
      sum;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          if (_.isString(options)) {
            options.path = options;
          }
          extractor = new unzip.Extract(options);
          $ctx.state = 8;
          break;
        case 8:
          $ctx.state = 2;
          return this.downloadToStream(url, extractor, options.hash);
        case 2:
          sum = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          this.testSum(url, sum, options);
          $ctx.state = 10;
          break;
        case 10:
          $ctx.returnValue = sum;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__4, this);
}));
Downloader.prototype.testSum = function(url, sum, options) {
  if (options.hash && sum && options.sum && options.sum !== sum) {
    throw new Error(options.hash.toUpperCase() + " sum of download '" + url + "' mismatch!");
  }
};
module.exports = Downloader;

//# sourceMappingURL=downloader.js.map
