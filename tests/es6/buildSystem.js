"use strict";
/* global describe,it,before */

let assert = require("assert");
let lib = require("../../");
let CMake = lib.CMake;
let _ = require("lodash");
let path = require("path");
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

    after(function() {
        lib.locateNAN.__projectRoot = undefined;
    });

    describe("Build with various options", function() {
        testRunner.runCase(testCases.buildPrototypeWithDirectoryOption);
    });

    it("should provide list of generators", async function () {
        let gens = await CMake.getGenerators();
        assert(_.isArray(gens));
        assert(gens.length > 0);
        assert.equal(gens.filter(function (g) { return g.length; }).length, gens.length);
    });

    it("should rebuild prototype if cwd is the source directory", async function () {
        await testCases.buildPrototype2WithCWD();
    });

    it("should run with old GNU compilers", async function () {
        await testCases.shouldConfigurePreC11Properly();
    });

    it("should configure with custom option", async function () {
        await testCases.configureWithCustomOptions();
    });
});
