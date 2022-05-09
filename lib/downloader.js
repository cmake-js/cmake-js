"use strict";
let crypto = require("crypto");
let axios = require("axios");
let MemoryStream = require("memory-stream");
let zlib = require("zlib");
let tar = require("tar");
let fs = require("fs");
let CMLog = require("./cmLog");

function Downloader(options) {
    this.options = options || {};
    this.log = new CMLog(this.options);
}

Downloader.prototype.downloadToStream = function(url, stream, hash) {
    let self = this;
    let shasum = hash ? crypto.createHash(hash) : null;
    return new Promise(function (resolve, reject) {
        let length = 0;
        let done = 0;
        let lastPercent = 0;
        axios
            .get(url, { responseType: "stream" })
            .then(function (response) {
                length = parseInt(response.headers["content-length"]);
                if (typeof length !== 'number') {
                    length = 0;
                }

                response.data.on('data', function (chunk) {
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

                response.data.pipe(stream)
            })
            .catch(function (err) {
                reject(err);
            })

        stream.once("error", function (err) {
            reject(err);
        });

        stream.once("finish", function () {
            resolve(shasum ? shasum.digest("hex") : undefined);
        });
    });
};

Downloader.prototype.downloadString = async function (url) {
    let result = new MemoryStream();
    await this.downloadToStream(url, result);
    return result.toString();
};

Downloader.prototype.downloadFile = async function (url, options) {
    if (typeof options === 'string') {
        options.path = options;
    }
    let result = fs.createWriteStream(options.path);
    let sum = await this.downloadToStream(url, result, options.hash);
    this.testSum(url, sum, options);
    return sum;
};

Downloader.prototype.downloadTgz = async function (url, options) {
    if (typeof options === 'string') {
        options.cwd = options;
    }
    let gunzip = zlib.createGunzip();
    let extractor = tar.extract(options);
    gunzip.pipe(extractor);
    let sum =  await this.downloadToStream(url, gunzip, options.hash);
    this.testSum(url, sum, options);
    return sum;
};

Downloader.prototype.testSum = function(url, sum, options) {
    if (options.hash && sum && options.sum && options.sum !== sum) {
        throw new Error(options.hash.toUpperCase() + " sum of download '" + url + "' mismatch!");
    }
};

module.exports = Downloader;
