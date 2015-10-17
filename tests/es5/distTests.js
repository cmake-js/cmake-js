"use strict";
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var Dist = require("../../").Dist;
var assert = require("assert");
var testDownload = process.env.TEST_DOWNLOAD === "1";
describe("dist", function() {
  it("should download dist files if needed", function(done) {
    this.timeout(60000);
    var dist = new Dist();
    console.log("Internal path: " + dist.internalPath);
    if (testDownload) {
      fs.deleteAsync(dist.internalPath).then(function() {
        assert(dist.downloaded === false);
        return dist.ensureDownloaded();
      }).then(function() {
        assert(dist.downloaded);
      }).nodeify(done);
    } else {
      dist.ensureDownloaded().nodeify(done);
    }
  });
});

//# sourceMappingURL=distTests.js.map
