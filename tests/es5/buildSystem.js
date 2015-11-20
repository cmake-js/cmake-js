"use strict";
var assert = require("assert");
var lib = require("../../");
var CMake = lib.CMake;
var BuildSystem = lib.BuildSystem;
var _ = require("lodash");
var path = require("path");
var Bluebird = require("bluebird");
var async = Bluebird.coroutine;
var log = require("npmlog");
var testRunner = require("./testRunner");
var testCases = require("./testCases");
describe("BuildSystem", function() {
  this.timeout(300000);
  before(function() {
    if (process.env.UT_LOG_LEVEL) {
      log.level = process.env.UT_LOG_LEVEL;
      log.resume();
    }
    lib.locateNAN.__projectRoot = path.resolve(path.join(__dirname, "../../"));
  });
  describe("Build with various options", function() {
    testRunner.runCase(testCases.buildPrototypeWithDirectoryOption);
  });
  it("should provide list of generators", function(done) {
    async($traceurRuntime.initGeneratorFunction(function $__0() {
      var gens;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $ctx.state = 2;
              return CMake.getGenerators();
            case 2:
              gens = $ctx.sent;
              $ctx.state = 4;
              break;
            case 4:
              assert(_.isArray(gens));
              assert(gens.length > 0);
              assert.equal(gens.filter(function(g) {
                return g.length;
              }).length, gens.length);
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__0, this);
    }))().nodeify(done);
  });
  it("should rebuild prototype if cwd is the source directory", function(done) {
    testCases.buildPrototype2WithCWD().nodeify(done);
  });
  it("should run with old GNU compilers", function(done) {
    testCases.shouldConfigurePreC11Properly().nodeify(done);
  });
});

//# sourceMappingURL=buildSystem.js.map
