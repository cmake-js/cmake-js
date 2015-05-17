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

function downloadTo(url, result, calculateSum) {
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

function testSum(sums, sum, fPath) {
    var serverSum = _.first(sums.filter(function (s) { return s.getPath === fPath; }));
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

// Props
Object.defineProperties(Dist.prototype, {
    internalPath: {
        get: function () {
            return path.join(
                environment.home,
                ".cmake-js",
                (this.targetOptions.runtime) + "-" + this.targetOptions.architecture,
                "v" + this.targetOptions.runtimeVersion);
        }
    },
    externalPath: {
        get: function () {
            switch (this.targetOptions.runtime) {
                case "node":
                    return "http://nodejs.org/dist/v" + this.targetOptions.runtimeVersion + "/";
                case "iojs":
                    return "https://iojs.org/dist/v" + this.targetOptions.runtimeVersion + "/";
                case "nw":
                    return "http://node-webkit.s3.amazonaws.com/v" + this.targetOptions.runtimeVersion + "/";
                case "atom-shell": 
                    return "https://atom.io/download/atom-shell/v"+this.target.runtimeVersion+"/";
                default:
                    throw new Error("Unknown runtime '" + this.targetOptions.runtime + "'!");
            }
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
            if (this.targetOptions.runtime === "nw") {
                return path.join(this.internalPath, (this.targetOptions.isX64 ? "x64" : ""));
            }
            else {
                return path.join(this.internalPath, (this.targetOptions.isX64 ? "win-x64" : "win-x86"));
            }
        }
    },
    winLibPath: {
        get: function () {
            return path.join(this.winLibDir, this.targetOptions.runtime + ".lib");
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
    var fn;
    if (self.targetOptions.runtime === "nw") {
        fn = "nw-headers-v" + self.targetOptions.runtimeVersion + ".tar.gz";
    }
    else if (self.targetOptions.runtime === "atom-shell") {
        fn =  "node" + "-v" + self.targetOptions.runtimeVersion + ".tar.gz";
    }
    else {
        fn = self.targetOptions.runtime + "-v" + self.targetOptions.runtimeVersion + ".tar.gz";
    }
    var tarUrl = urljoin(self.externalPath, fn);
    log.http("DIST", "\t- " + tarUrl);

    return new Bluebird(function (resolve, reject) {
        var shasum = crypto.createHash('sha256');
        extracter.once("end", function () {
            try {
                if (sums) {
                    testSum(sums, shasum.digest('hex'), fn);
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

    var subDir;
    var fn = self.targetOptions.runtime + ".lib";
    if (self.targetOptions.runtime === "nw") {
        subDir = self.targetOptions.isX64 ? "x64" : "";
    }
    else {
        subDir = self.targetOptions.isX64 ? "win-x64" : "win-x86";
    }
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
