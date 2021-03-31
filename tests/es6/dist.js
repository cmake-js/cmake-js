"use strict";
/* global describe,it */

const Bluebird = require("bluebird");
const fs = require("fs-extra");
const Dist = require("../../").Dist;
const assert = require("assert");
const async = Bluebird.coroutine;

const testDownload = process.env.TEST_DOWNLOAD === "1";

describe("dist", function () {
    it("should download dist files if needed", function (done) {
        this.timeout(60000);
        async(function*() {
            const dist = new Dist();
            if (testDownload) {
                yield fs.remove(dist.internalPath);
                assert(dist.downloaded === false);
                yield dist.ensureDownloaded();
                assert(dist.downloaded);
            }
            else {
                yield dist.ensureDownloaded();
            }
        })().nodeify(done);
    });

});
