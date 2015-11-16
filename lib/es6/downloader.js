"use strict";
let Bluebird = require("bluebird");
let crypto = require("crypto");
let request = require("request");
let async = Bluebird.coroutine;
let MemoryStream = require("memory-stream");
let zlib = require("zlib");
let tar = require("tar");
let fs = Bluebird.promisifyAll(require("fs-extra"));
let _ = require("lodash");
let unzip = require("unzip");

let downloader = {
    downloadToStream: function(url, stream, hash) {
        let shasum = hash ? crypto.createHash(hash) : null;
        return new Bluebird(function (resolve, reject) {
            request
                .get(url)
                .on('error', function (err) {
                    reject(err);
                })
                .on('data', function (chunk) {
                    if (shasum) {
                        shasum.update(chunk);
                    }
                })
                .pipe(stream);

            stream.once("error", function (err) {
                reject(err);
            });

            stream.once("finish", function () {
                resolve(shasum ? shasum.digest('hex') : undefined);
            });
        });
    },
    downloadString: async(function* (url) {
        let result = new MemoryStream();
        yield downloader.downloadToStream(url, result);
        return result.toString();
    }),
    downloadFile: async(function* (url, options) {
        if (_.isString(options)) {
            options.path = options;
        }
        let result = fs.createWriteStream(options.path);
        let sum = yield downloader.downloadToStream(url, result, options.hash);
        this.testSum(url, sum, options);
        return sum;
    }),
    downloadTgz: async(function*(url, options) {
        if (_.isString(options)) {
            options.path = options;
        }
        let gunzip = zlib.createGunzip();
        let extractor = new tar.Extract(options);
        gunzip.pipe(extractor);
        let sum =  yield this.downloadToStream(url, gunzip, options.hash);
        this.testSum(url, sum, options);
        return sum;
    }),
    downloadZip: async(function*(url, options) {
        if (_.isString(options)) {
            options.path = options;
        }
        let extractor = new unzip.Extract(options);
        let sum =  yield this.downloadToStream(url, extractor, options.hash);
        this.testSum(url, sum, options);
        return sum;
    }),
    testSum: function(url, sum, options) {
        if (options.hash && sum && options.sum && options.sum !== sum) {
            throw new Error(options.hash.toUpperCase() + " sum of download '" + url + "' mismatch!");
        }
    }
};

module.exports = downloader;