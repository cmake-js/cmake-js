"use strict";
let environment = require("./environment");
let path = require("path");
let urljoin = require("url-join");
let fs = require("fs-extra");
let _ = require("lodash");
let CMLog = require("./cmLog");
let TargetOptions = require("./targetOptions");
let runtimePaths = require("./runtimePaths");
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
            let cacheDirectory =  ".cmake-js";
            let runtimeArchDirectory = (this.targetOptions.runtime) + "-" + this.targetOptions.arch;
            let runtimeVersionDirectory = "v" + this.targetOptions.runtimeVersion;

            return this.options.runtimeDirectory ||
                path.join(environment.home,
                    cacheDirectory,
                    runtimeArchDirectory,
                    runtimeVersionDirectory);
        }
    },
    externalPath: {
        get: function () {
            return runtimePaths.get(this.targetOptions).externalPath;
        }
    },
    downloaded: {
        get: function () {
            let headers = false;
            let libs = true;
            let stat = getStat(this.internalPath);
            if (stat.isDirectory()) {
                if (this.headerOnly) {
                    stat = getStat(path.join(this.internalPath, "include/node/node.h"));
                    headers = stat.isFile();
                }
                else {
                    stat = getStat(path.join(this.internalPath, "src/node.h"));
                    if (stat.isFile()) {
                        stat = getStat(path.join(this.internalPath, "deps/v8/include/v8.h"));
                        headers = stat.isFile();
                    }
                }
                if (environment.isWin) {
                    for (let libPath of this.winLibs) {
                        stat = getStat(libPath);
                        libs = libs && stat.isFile();
                    }
                }
            }
            return headers && libs;

            function getStat(path) {
                try {
                    return fs.statSync(path);
                }
                catch (e) {
                    return {
                        isFile: _.constant(false),
                        isDirectory: _.constant(false)
                    };
                }
            }
        }
    },
    winLibs: {
        get: function () {
            let libs = runtimePaths.get(this.targetOptions).winLibs;
            let result = [];
            for (let lib of libs) {
                result.push(path.join(this.internalPath, lib.dir, lib.name));
            }
            return result;
        }
    },
    headerOnly: {
        get: function () {
            return runtimePaths.get(this.targetOptions).headerOnly;
        }
    }
});

// Methods
Dist.prototype.ensureDownloaded = async function () {
    if (!this.downloaded) {
        await this.download();
    }
};

Dist.prototype.download = async function () {
    let log = this.log;
    log.info("DIST", "Downloading distribution files to: " + this.internalPath);
    await fs.ensureDir(this.internalPath);
    let sums = await this._downloadShaSums();
    await Promise.all([this._downloadLibs(sums), this._downloadTar(sums)]);
};

Dist.prototype._downloadShaSums = async function () {
    if (this.targetOptions.runtime === "node" || this.targetOptions.runtime === "iojs") {
        let sumUrl = urljoin(this.externalPath, "SHASUMS256.txt");
        let log = this.log;
        log.http("DIST", "\t- " + sumUrl);
        return (await this.downloader.downloadString(sumUrl))
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
};

Dist.prototype._downloadTar = async function (sums) {
    let log = this.log;
    let self = this;
    let tarLocalPath = runtimePaths.get(self.targetOptions).tarPath;
    let tarUrl = urljoin(self.externalPath, tarLocalPath);
    log.http("DIST", "\t- " + tarUrl);

    let sum = await this.downloader.downloadTgz(tarUrl, {
        hash: sums ? "sha256" : null,
        cwd: self.internalPath,
        strip: 1,
        filter: function (entryPath) {
            if (entryPath === self.internalPath) {
                return true;
            }
            let ext = path.extname(entryPath);
            return ext && ext.toLowerCase() === ".h";
        }
    });

    if (sums) {
        testSum(sums, sum, tarLocalPath);
    }
};

Dist.prototype._downloadLibs = async function (sums) {
    const log = this.log;
    const self = this;
    if (!environment.isWin) {
        return;
    }

    const paths = runtimePaths.get(self.targetOptions);
    for (const dirs of paths.winLibs) {
        const subDir = dirs.dir;
        const fn = dirs.name;
        const fPath = subDir ? urljoin(subDir, fn) : fn;
        const libUrl = urljoin(self.externalPath, fPath);
        log.http("DIST", "\t- " + libUrl);

        await fs.ensureDir(path.join(self.internalPath, subDir));

        const sum = await this.downloader.downloadFile(libUrl, {
            path: path.join(self.internalPath, fPath),
            hash: sums ? "sha256" : null
        });

        if (sums) {
            testSum(sums, sum, fPath);
        }
    }
};

module.exports = Dist;
