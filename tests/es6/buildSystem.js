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
let testRunner = require("./testRunner");
let testCases = require("./testCases");

describe("BuildSystem", function () {
    this.timeout(300000);

    before(function() {
        if (process.env.UT_LOG_LEVEL) {
            log.level = process.env.UT_LOG_LEVEL;
            log.resume();
        }
        lib.locateNAN.__projectRoot = path.resolve(path.join(__dirname, "../../"));
    });

    it("should provide list of generators", function (done) {
        async(function*() {
            let gens = yield CMake.getGenerators();
            assert(_.isArray(gens));
            assert(gens.length > 0);
            assert.equal(gens.filter(function (g) { return g.length; }).length, gens.length);
        })().nodeify(done);
    });

    it("should rebuild prototype if cwd is the source directory", function (done) {
        testCases.buildPrototype2WithCWD().nodeify(done);
    });

    it("should run with old GNU compilers", function (done) {
        testCases.shouldConfigurePreC11Properly().nodeify(done);
    });

    describe("Build with various options", function() {
        testRunner.runCase(testCases.buildPrototypeWithDirectoryOption);
    });
});