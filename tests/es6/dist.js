"use strict";
/* global describe,it */

let fs = require("fs-extra");
let Dist = require("../../").Dist;
let assert = require("assert");

let testDownload = process.env.TEST_DOWNLOAD === "1";

describe("dist", function () {
    it("should download dist files if needed", async function () {
        this.timeout(60000);

        let dist = new Dist();
        if (testDownload) {
            await fs.remove(dist.internalPath);
            assert(dist.downloaded === false);
            await dist.ensureDownloaded();
            assert(dist.downloaded);
        }
        else {
            await dist.ensureDownloaded();
        }
    });

});
