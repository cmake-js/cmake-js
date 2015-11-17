"use strict";
/* global describe,it,before */

let assert = require("assert");
let lib = require("../../");
let CMake = lib.CMake;
let BuildSystem = lib.BuildSystem;
let _ = require("lodash");
let path = require("path");
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let log = require("npmlog");

describe("CMake", function () {
    before(function() {
        log.level = "silly";
        log.resume();
    });

    it("should provide list of generators", function (done) {
        async(function*() {
            let gens = yield CMake.getGenerators();
            assert(_.isArray(gens));
            assert(gens.length > 0);
            assert.equal(gens.filter(function (g) { return g.length; }).length, gens.length);
        })().nodeify(done);
    });

    it("should rebuild prototype with explicit directory option specified", function (done) {
        this.timeout(30000);
        async(function*() {
            let cmake = new BuildSystem({
                directory: path.resolve(path.join(__dirname, "./prototype"))
            });
            yield cmake.rebuild();
            let addon = require("./prototype/build/Release/addon.node");
            assert.equal(addon.add(3, 5), 3 + 5);
        })().nodeify(done);
    });

    it("should rebuild prototype if cwd is the source directory", function (done) {
        this.timeout(30000);
        async(function*() {
            let cwd = process.cwd();
            process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
            let cmake = new BuildSystem();
            try {
                yield cmake.rebuild();
                process.chdir(cwd);
                let addon = require("./prototype2/build/Release/addon2.node");
                assert.equal(addon.mul(5, 6), 5 * 6);
            }
            finally {
                process.chdir(cwd);
            }
        })().nodeify(done);
    });

    it("should run with old compilers pre c++11", function (done) {
        this.timeout(30000);
        async(function*() {
            let cwd = process.cwd();
            process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
            let cmake = new CMake({forceNoC11:true});
            let command = yield cmake.getConfigureCommand();
            assert.equal(command.indexOf("-std=c++11"), -1, "c++11 still forced");
        })().nodeify(done);
    });
});