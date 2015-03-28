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
var IntLog = require("./intLog");

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

var dist = module.exports = {
    internalPath: path.join(
        environment.home,
        ".cmake-js",
        (environment.isIOJS ? "iojs" : "node") + "-" + environment.architecture,
        "v" + environment.runtimeVersion),
    _externalPath: null,
    _downloaded: null,
    ensureDownloaded: function (options) {
        if (!dist.downloaded) {
            return dist.download(options);
        }
        return Bluebird.resolve();
    },
    download: function (options) {
        options = options || {};
        var log = new IntLog(options);
        log.info("DIST", "Downloading distribution files.");
        return fs.mkdirpAsync(dist.internalPath)
            .then(function () {
                return dist._downloadShaSums(options)
                    .then(function (sums) {
                        return Bluebird.all([dist._downloadLib(options, sums), dist._downloadTar(options, sums)]);
                    });
            });
    },
    _downloadShaSums: function (options) {
        var result = new MemoryStream();
        var sumUrl = urljoin(dist.externalPath, "SHASUMS256.txt");
        var log = new IntLog(options);
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
    },
    _downloadTar: function (options, sums) {
        var log = new IntLog(options);
        var gunzip = zlib.createGunzip();
        var extracter = new tar.Extract({
            path: dist.internalPath,
            strip: 1,
            filter: function () {
                if (this.path === dist.internalPath) {
                    return true;
                }
                var ext = path.extname(this.path);
                return ext && ext.toLowerCase() === ".h";
            }
        });
        var fn = (environment.isIOJS ? "iojs" : "node") + "-v" + environment.runtimeVersion + ".tar.gz";
        var tarUrl = urljoin(dist.externalPath, fn);
        log.http("DIST", "\t- " + tarUrl);

        return new Bluebird(function (resolve, reject) {
            var shasum = crypto.createHash('sha256');
            extracter.once("end", function () {
                try {
                    testSum(sums, shasum.digest('hex'), fn);
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
    },
    _downloadLib: function (options, sums) {
        var log = new IntLog(options);
        if (!environment.isWin) {
            return Bluebird.resolve();
        }

        var fn = (environment.isIOJS ? "iojs" : "node") + ".lib";
        var subDir = (environment.isX64 ? "win-x64" : "win-x86");
        var fPath = urljoin(subDir, fn);
        var libUrl = urljoin(dist.externalPath, fPath);
        log.http("DIST", "\t- " + libUrl);

        return fs.mkdirpAsync(path.join(dist.internalPath, subDir))
            .then(function () {
                var result = fs.createWriteStream(path.join(dist.internalPath, fPath));
                return downloadTo(libUrl, result, true)
                    .then(function (sum) {
                        testSum(sums, sum, fPath);
                    });
            });
    }
};

Object.defineProperties(dist, {
    externalPath: {
        get: function () {
            if (!this._externalPath) {
                if (environment.isIOJS) {
                    this._externalPath = "https://iojs.org/dist/v" + environment.runtimeVersion + "/";
                }
                else {
                    this._externalPath = "http://nodejs.org/dist/v" + environment.runtimeVersion + "/";
                }
            }
            return this._externalPath;
        }
    },
    downloaded: {
        get: function () {
            try {
                var stat = fs.lstatSync(this.internalPath);
                if (stat.isDirectory()) {
                    stat = fs.lstatSync(path.join(this.internalPath, "src/node.h"));
                    if (!stat.isDirectory()) {
                        stat = fs.lstatSync(path.join(this.internalPath, "deps/v8/include/v8.h"));
                        return !stat.isDirectory();
                    }
                }
            }
            catch (e) {
                _.noop(e);
            }
            return false;
        }
    },
    winLibDir: {
        get: function () {
            return path.join(dist.internalPath, (environment.isX64 ? "win-x64" : "win-x86"));
        }
    },
    winLibPath: {
        get: function () {
            return path.join(this.winLibDir, (environment.isIOJS ? "iojs" : "node") + ".lib");
        }
    }
});
