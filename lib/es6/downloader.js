"use strict";
let Bluebird = require("bluebird");
let crypto = require("crypto");
let request = require("request");
let async = Bluebird.coroutine;
let MemoryStream = require("memory-stream");
let zlib = require("zlib");
let tar = require("tar");
let fs = require("fs");
let _ = require("lodash");
let unzip = require("unzipper");
let CMLog = require("./cmLog");

function Downloader(options) {
    this.options = options || {};
    this.log = new CMLog(this.options);
}

Downloader.prototype.downloadToStream = function(url, stream, hash) {
    let self = this;
    let shasum = hash ? crypto.createHash(hash) : null;
    return new Bluebird(function (resolve, reject) {
        let length = 0;
        let done = 0;
        let lastPercent = 0;
        request
            .get(url)
            .on("error", function (err) {
                reject(err);
            })
            .on("response", function(data) {
                length = parseInt(data.headers["content-length"]);
                if (!_.isNumber(length)) {
                    length = 0;
                }
            })
            .on("data", function (chunk) {
                if (shasum) {
                    shasum.update(chunk);
                }
                if (length) {
                    done += chunk.length;
                    let percent = done / length * 100;
                    percent = Math.round(percent / 10) * 10 + 10;
                    if (percent > lastPercent) {
                        self.log.verbose("DWNL", "\t" + lastPercent + "%");
                        lastPercent = percent;
                    }
                }
            })
            .pipe(stream);

        stream.once("error", function (err) {
            reject(err);
        });

        stream.once("finish", function () {
            resolve(shasum ? shasum.digest("hex") : undefined);
        });
    });
};

Downloader.prototype.downloadString = async(function* (url) {
    let result = new MemoryStream();
    yield this.downloadToStream(url, result);
    return result.toString();
});

Downloader.prototype.downloadFile = async(function* (url, options) {
    if (_.isString(options)) {
        options.path = options;
    }
    let result = fs.createWriteStream(options.path);
    let sum = yield this.downloadToStream(url, result, options.hash);
    this.testSum(url, sum, options);
    return sum;
});

Downloader.prototype.downloadTgz = async(function*(url, options) {
    if (_.isString(options)) {
        options.cwd = options;
    }
    let gunzip = zlib.createGunzip();
    let extractor = tar.extract(options);
    gunzip.pipe(extractor);
    let sum =  yield this.downloadToStream(url, gunzip, options.hash);
    this.testSum(url, sum, options);
    return sum;
});

Downloader.prototype.downloadZip = async(function*(url, options) {
    if (_.isString(options)) {
        options.path = options;
    }
    let extractor = new unzip.Extract(options);
    let sum =  yield this.downloadToStream(url, extractor, options.hash);
    this.testSum(url, sum, options);
    return sum;
});

Downloader.prototype.testSum = function(url, sum, options) {
    if (options.hash && sum && options.sum && options.sum !== sum) {
        throw new Error(options.hash.toUpperCase() + " sum of download '" + url + "' mismatch!");
    }
};

module.exports = Downloader;
