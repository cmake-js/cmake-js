"use strict";
/* global describe,it */

var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var dist = require("../lib/dist");
var assert = require("assert");

var testDownload = process.env.TEST_DOWNLOAD === "1";

describe("dist", function () {
    if (testDownload) {
        it("should download dist files if needed", function (done) {
            this.timeout(30000);
            console.log("Internal path: " + dist.internalPath);
            fs.deleteAsync(dist.internalPath)
                .then(function () {
                    assert(dist.downloaded === false);
                    return dist.ensureDownloaded();
                })
                .then(function () {
                    assert(dist.downloaded);
                })
                .nodeify(done);
        });
    }
});