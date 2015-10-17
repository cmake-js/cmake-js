"use strict";
var assert = require("assert");
var CMake = require("../../").CMake;
var _ = require("lodash");
var path = require("path");
var Bluebird = require("bluebird");
var async = Bluebird.coroutine;
describe("CMake", function() {
  it("should provide list of generators", function(done) {
    async($traceurRuntime.initGeneratorFunction(function $__1() {
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
      }, $__1, this);
    }))().nodeify(done);
  });
  it("should rebuild prototype with explicit directory option specified", function(done) {
    this.timeout(30000);
    async($traceurRuntime.initGeneratorFunction(function $__1() {
      var cmake,
          addon;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              cmake = new CMake({directory: path.resolve(path.join(__dirname, "./prototype"))});
              $ctx.state = 6;
              break;
            case 6:
              $ctx.state = 2;
              return cmake.rebuild();
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            case 4:
              addon = require("./prototype/build/Release/addon.node");
              assert.equal(addon.add(3, 5), 3 + 5);
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__1, this);
    }))().nodeify(done);
  });
  it("should rebuild prototype if cwd is the source directory", function(done) {
    this.timeout(30000);
    async($traceurRuntime.initGeneratorFunction(function $__1() {
      var cwd,
          cmake,
          addon;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              cwd = process.cwd();
              process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
              cmake = new CMake();
              $ctx.state = 16;
              break;
            case 16:
              $ctx.pushTry(null, 8);
              $ctx.state = 10;
              break;
            case 10:
              $ctx.state = 2;
              return cmake.rebuild();
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            case 4:
              process.chdir(cwd);
              addon = require("./prototype2/build/Release/addon2.node");
              assert.equal(addon.mul(5, 6), 5 * 6);
              $ctx.state = 8;
              $ctx.finallyFallThrough = -2;
              break;
            case 8:
              $ctx.popTry();
              $ctx.state = 14;
              break;
            case 14:
              process.chdir(cwd);
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = $ctx.finallyFallThrough;
              break;
            default:
              return $ctx.end();
          }
      }, $__1, this);
    }))().nodeify(done);
  });
  it("should run with old compilers pre c++11", function(done) {
    this.timeout(30000);
    async($traceurRuntime.initGeneratorFunction(function $__1() {
      var cwd,
          cmake,
          command;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              cwd = process.cwd();
              process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
              cmake = new CMake({forceNoC11: true});
              $ctx.state = 6;
              break;
            case 6:
              $ctx.state = 2;
              return cmake.getConfigureCommand();
            case 2:
              command = $ctx.sent;
              $ctx.state = 4;
              break;
            case 4:
              assert.equal(command.indexOf("-std=c++11"), -1, "c++11 still forced");
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__1, this);
    }))().nodeify(done);
  });
});

//# sourceMappingURL=cMakeTests.js.map
