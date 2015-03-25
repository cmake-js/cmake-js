"use strict";
/* global describe,it */

var Bluebird = require("bluebird");
var rimraf = Bluebird.promisify(require("rimraf"));
var dist = require("../lib/dist");
var assert = require("assert");

var testDownload = process.env.TEST_DWONLOAD === "1";

describe("dist", function () {
    if (testDownload) {
        it("should download dist files if needed", function (done) {
            this.timeout(30000);
            console.log("Internal path: " + dist.internalPath);
            rimraf(dist.internalPath)
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