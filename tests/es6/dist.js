"use strict";
/* global describe,it */

const fs = require("fs-extra");
const Dist = require("../../").Dist;
const assert = require("assert");

const testDownload = process.env.TEST_DOWNLOAD === "1";

describe("dist", function () {
    it("should download dist files if needed", async function () {
        this.timeout(60000);

        const dist = new Dist();
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
