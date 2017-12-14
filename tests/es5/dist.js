"use strict";
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var Dist = require("../../").Dist;
var assert = require("assert");
var async = Bluebird.coroutine;
var testDownload = process.env.TEST_DOWNLOAD === "1";
describe("dist", function() {
  it("should download dist files if needed", function(done) {
    this.timeout(60000);
    async($traceurRuntime.initGeneratorFunction(function $__2() {
      var dist;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              dist = new Dist();
              $ctx.state = 19;
              break;
            case 19:
              $ctx.state = (testDownload) ? 1 : 13;
              break;
            case 1:
              $ctx.state = 2;
              return fs.removeAsync(dist.internalPath);
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            case 4:
              assert(dist.downloaded === false);
              $ctx.state = 10;
              break;
            case 10:
              $ctx.state = 6;
              return dist.ensureDownloaded();
            case 6:
              $ctx.maybeThrow();
              $ctx.state = 8;
              break;
            case 8:
              assert(dist.downloaded);
              $ctx.state = -2;
              break;
            case 13:
              $ctx.state = 14;
              return dist.ensureDownloaded();
            case 14:
              $ctx.maybeThrow();
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__2, this);
    }))().nodeify(done);
  });
  it("should be able to download dist files from other mirrors", function(done) {
    this.timeout(60000);
    async($traceurRuntime.initGeneratorFunction(function $__2() {
      var dist;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              dist = new Dist({mirrors: {node: "https://npm.taobao.org/mirrors/node"}});
              $ctx.state = 19;
              break;
            case 19:
              $ctx.state = (testDownload) ? 1 : 13;
              break;
            case 1:
              $ctx.state = 2;
              return fs.removeAsync(dist.internalPath);
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            case 4:
              assert(dist.downloaded === false);
              $ctx.state = 10;
              break;
            case 10:
              $ctx.state = 6;
              return dist.ensureDownloaded();
            case 6:
              $ctx.maybeThrow();
              $ctx.state = 8;
              break;
            case 8:
              assert(dist.downloaded);
              $ctx.state = -2;
              break;
            case 13:
              $ctx.state = 14;
              return dist.ensureDownloaded();
            case 14:
              $ctx.maybeThrow();
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__2, this);
    }))().nodeify(done);
  });
});

//# sourceMappingURL=dist.js.map
