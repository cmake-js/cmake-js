"use strict";
var assert = require("assert");
var CMake = require("../../").CMake;
var _ = require("lodash");
var path = require("path");
describe("CMake", function() {
  it("should provide list of generators", function(done) {
    CMake.getGenerators().then(function(gens) {
      assert(_.isArray(gens));
      assert(gens.length > 0);
      assert.equal(gens.filter(function(g) {
        return g.length;
      }).length, gens.length);
    }).nodeify(done);
  });
  it("should rebuild prototype with explicit directory option specified", function(done) {
    this.timeout(30000);
    var cmake = new CMake({directory: path.resolve(path.join(__dirname, "./prototype"))});
    cmake.rebuild().then(function() {
      var addon = require("./prototype/build/Release/addon.node");
      assert.equal(addon.add(3, 5), 3 + 5);
    }).nodeify(done);
  });
  it("should rebuild prototype if cwd is the source directory", function(done) {
    this.timeout(30000);
    var cwd = process.cwd();
    process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
    var cmake = new CMake();
    cmake.rebuild().then(function() {
      process.chdir(cwd);
      var addon = require("./prototype2/build/Release/addon2.node");
      assert.equal(addon.mul(5, 6), 5 * 6);
    }).finally(function() {
      process.chdir(cwd);
    }).nodeify(done);
  });
  it("should run with old compilers pre c++11", function(done) {
    this.timeout(30000);
    var cwd = process.cwd();
    process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
    var cmake = new CMake({forceNoC11: true});
    cmake.getConfigureCommand().then(function(command) {
      assert.equal(command.indexOf("-std=c++11"), -1, "c++11 still forced");
    }).nodeify(done);
  });
});

//# sourceMappingURL=cMakeTests.js.map
