"use strict";
/* global describe,it,before */

const assert = require("assert");
const lib = require("../../");
const CMake = lib.CMake;
const BuildSystem = lib.BuildSystem;
const _ = require("lodash");
const path = require("path");
const Bluebird = require("bluebird");
const async = Bluebird.coroutine;
const log = require("npmlog");
const testRunner = require("./testRunner");
const testCases = require("./testCases");

describe("BuildSystem", function () {
    this.timeout(300000);

    before(function() {
        if (process.env.UT_LOG_LEVEL) {
            log.level = process.env.UT_LOG_LEVEL;
            log.resume();
        }
        lib.locateNAN.__projectRoot = path.resolve(path.join(__dirname, "../../"));
    });

    after(function() {
        lib.locateNAN.__projectRoot = undefined;
    });

    describe("Build with various options", function() {
        testRunner.runCase(testCases.buildPrototypeWithDirectoryOption);
    });

    it("should provide list of generators", function (done) {
        async(function*() {
            const gens = yield CMake.getGenerators();
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

    it("should configure with custom option", function (done) {
        testCases.configureWithCustomOptions().nodeify(done);
    });
});
