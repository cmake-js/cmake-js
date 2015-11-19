"use strict";
let environment = require("./environment");
let path = require("path");
let urljoin = require("url-join");
let Bluebird = require("bluebird");
let fs = Bluebird.promisifyAll(require("fs-extra"));
let _ = require("lodash");
let CMLog = require("./cmLog");
let TargetOptions = require("./targetOptions");
let runtimePaths = require("./runtimePaths");
let async = Bluebird.coroutine;
let Downloader = require("./downloader");

function testSum(sums, sum, fPath) {
    let serverSum = _.first(sums.filter(function (s) {
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
            let result = false;
            try {
                let stat = fs.lstatSync(this.internalPath);
                if (stat.isDirectory()) {
                    if (this.headerOnly) {
                        stat = fs.lstatSync(path.join(this.internalPath, "include/node/node.h"));
                        result = !stat.isDirectory();
                    }
                    else {
                        stat = fs.lstatSync(path.join(this.internalPath, "src/node.h"));
                        if (!stat.isDirectory()) {
                            stat = fs.lstatSync(path.join(this.internalPath, "deps/v8/include/v8.h"));
                            result = !stat.isDirectory();
                        }
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
        get: function () {
            return runtimePaths.get(this.targetOptions).headerOnly;
        }
    }
});

// Methods
Dist.prototype.ensureDownloaded = async(function* () {
    if (!this.downloaded) {
        yield this.download();
    }
});

Dist.prototype.download = async(function* () {
    let log = this.log;
    log.info("DIST", "Downloading distribution files.");
    yield fs.mkdirpAsync(this.internalPath);
    let sums = yield this._downloadShaSums();
    yield Bluebird.all([this._downloadLib(sums), this._downloadTar(sums)]);
});

Dist.prototype._downloadShaSums = async(function* () {
    if (this.targetOptions.runtime === "node" || this.targetOptions.runtime === "iojs") {
        let sumUrl = urljoin(this.externalPath, "SHASUMS256.txt");
        let log = this.log;
        log.http("DIST", "\t- " + sumUrl);
        return (yield this.downloader.downloadString(sumUrl))
            .split("\n")
            .map(function (line) {
                let parts = line.split(/\s+/);
                return {
                    getPath: parts[1],
                    sum: parts[0]
                };
            })
            .filter(function (i) {
                return i.getPath && i.sum;
            });
    }
    else {
        return null;
    }
});

Dist.prototype._downloadTar = async(function* (sums) {
    let log = this.log;
    let self = this;
    let tarLocalPath = runtimePaths.get(self.targetOptions).tarPath;
    let tarUrl = urljoin(self.externalPath, tarLocalPath);
    log.http("DIST", "\t- " + tarUrl);

    let sum = yield this.downloader.downloadTgz(tarUrl, {
        hash: sums ? "sha256" : null,
        path: self.internalPath,
        strip: 1,
        filter: function () {
            if (this.path === self.internalPath) {
                return true;
            }
            let ext = path.extname(this.path);
            return ext && ext.toLowerCase() === ".h";
        }
    });

    if (sums) {
        testSum(sums, sum, tarLocalPath);
    }
});

Dist.prototype._downloadLib = async(function* (sums) {
    let log = this.log;
    let self = this;
    if (!environment.isWin) {
        return;
    }

    let paths = runtimePaths.get(self.targetOptions);
    let subDir = paths.winLibDir;
    let fn = paths.winLibName;
    let fPath = subDir ? urljoin(subDir, fn) : fn;
    let libUrl = urljoin(self.externalPath, fPath);
    log.http("DIST", "\t- " + libUrl);

    yield fs.mkdirpAsync(path.join(self.internalPath, subDir));

    let sum = yield this.downloader.downloadFile(libUrl, {
        path: path.join(self.internalPath, fPath),
        hash: sums ? "sha256" : null
    });

    if (sums) {
        testSum(sums, sum, fPath);
    }
});

module.exports = Dist;
