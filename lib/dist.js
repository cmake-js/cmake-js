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

function downloadTo (url, result, calculateSum) {
    var shasum = calculateSum ? crypto.createHash('sha256') : null;
    return new Bluebird(function (resolve, reject) {
        request
            .get(url)
            .on('error', function (err) { reject(err); })
            .on('data', function (chunk) {
                if (shasum) {
                    shasum.update(chunk);
                }
            })
            .pipe(result);

        result.once("finish", function () { resolve(shasum ? shasum.digest('hex') : undefined); });
    });
}

function testSum (sums, sum, fPath) {
    var serverSum = _.first(sums.filter(function (s) { return s.getPath === fPath; }));
    if (serverSum && serverSum.sum === sum) {
        return;
    }
    throw new Error("SHA sum of file '" + fPath + "' mismatch!");
}

function Dist (options) {
    this.options = options || {};
    this.log = new CMLog(this.options);
    this.targetOptions = new TargetOptions(this.options);
}

// Props
Object.defineProperties(Dist.prototype, {
    internalPath: {
        get: function () {
            return path.join(
                environment.home,
                ".cmake-js",
                (this.targetOptions.runtime) + "-" + this.targetOptions.arch,
                "v" + this.targetOptions.runtimeVersion);
        }
    },
    externalPath: {
        get: function () {
            return runtimePaths.get(this.targetOptions).externalPath;
        }
    },
    downloaded: {
        get: function () {
            var result = false;
            try {
                var stat = fs.lstatSync(this.internalPath);
                if (stat.isDirectory()) {
                    stat = fs.lstatSync(path.join(this.internalPath, "src/node.h"));
                    if (!stat.isDirectory()) {
                        stat = fs.lstatSync(path.join(this.internalPath, "deps/v8/include/v8.h"));
                        result = !stat.isDirectory();
                    }
                }
            }
            catch (e) {
                _.noop(e);
            }
            return result;
        }
    },
    winLibDir: {
        get: function () {
            return path.join(this.internalPath, runtimePaths.get(this.targetOptions).winLibDir);
        }
    },
    winLibPath: {
        get: function () {
            return path.join(this.winLibDir, runtimePaths.get(this.targetOptions).winLibName);
        }
    },
    headerOnly: {
        get: function() {
            return runtimePaths.get(this.targetOptions).tarPath.indexOf("-headers") > 0;
        }
    }
});

// Methods
Dist.prototype.ensureDownloaded = function () {
    if (!this.downloaded) {
        return this.download();
    }
    return Bluebird.resolve();
};

Dist.prototype.download = function () {
    var log = this.log;
    var self = this;
    log.info("DIST", "Downloading distribution files.");
    return fs.mkdirpAsync(self.internalPath)
        .then(function () {
            return self._downloadShaSums()
                .then(function (sums) {
                    return Bluebird.all([self._downloadLib(sums), self._downloadTar(sums)]);
                });
        });
};

Dist.prototype._downloadShaSums = function () {
    var self = this;
    if (self.targetOptions.runtime === "node" || self.targetOptions.runtime === "iojs") {
        var result = new MemoryStream();
        var sumUrl = urljoin(self.externalPath, "SHASUMS256.txt");
        var log = this.log;
        log.http("DIST", "\t- " + sumUrl);
        return downloadTo(sumUrl, result, false)
            .then(function () {
                return result.toString()
                    .split("\n")
                    .map(function (line) {
                        var parts = line.split(/\s+/);
                        return {
                            getPath: parts[1],
                            sum: parts[0]
                        };
                    })
                    .filter(function (i) { return i.getPath && i.sum; });
            });
    }
    else {
        return Bluebird.resolve(null);
    }
};

Dist.prototype._downloadTar = function (sums) {
    var log = this.log;
    var self = this;
    var gunzip = zlib.createGunzip();
    var extracter = new tar.Extract({
        path: self.internalPath,
        strip: 1,
        filter: function () {
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

    return new Bluebird(function (resolve, reject) {
        var shasum = crypto.createHash('sha256');
        extracter.once("end", function () {
            try {
                if (sums) {
                    testSum(sums, shasum.digest('hex'), tarLocalPath);
                }
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
        extracter.once("error", function (err) { reject(err); });
        request
            .get(tarUrl)
            .on('error', function (err) { reject(err); })
            .on('data', function (chunk) { shasum.update(chunk); })
            .pipe(gunzip)
            .pipe(extracter);
    });
};

Dist.prototype._downloadLib = function (sums) {
    var log = this.log;
    var self = this;
    if (!environment.isWin) {
        return Bluebird.resolve();
    }

    var paths = runtimePaths.get(self.targetOptions);
    var subDir = paths.winLibDir;
    var fn = paths.winLibName;
    var fPath = subDir ? urljoin(subDir, fn) : fn;
    var libUrl = urljoin(self.externalPath, fPath);
    log.http("DIST", "\t- " + libUrl);

    return fs.mkdirpAsync(path.join(self.internalPath, subDir))
        .then(function () {
            var result = fs.createWriteStream(path.join(self.internalPath, fPath));
            return downloadTo(libUrl, result, true)
                .then(function (sum) {
                    if (sums) {
                        testSum(sums, sum, fPath);
                    }
                });
        });
};

module.exports = Dist;
