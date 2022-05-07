"use strict";
/* global it */
let lib = require("../../");
let environment = lib.environment;
let _ = require("lodash");
let log = require("npmlog");
let util = require("util");

function* generateRuntimeOptions() {
    function* generateForNode(arch) {
        // Old:
        yield {
            runtime: "node",
            runtimeVersion: "14.0.0",
            arch: arch
        };

        // LTS:
        yield {
            runtime: "node",
            runtimeVersion: "16.0.0",
            arch: arch
        };

        // Current:
        yield {
            runtime: "node",
            runtimeVersion: "18.0.0",
            arch: arch
        };
    }

    function* generateForNWJS(arch) {
        // Latest:
        yield {
            runtime: "nw",
            runtimeVersion: "0.64.0",
            arch: arch
        };
    }

    function* generateForElectron(arch) {
        // Latest:
        yield {
            runtime: "electron",
            runtimeVersion: "18.2.1",
            arch: arch
        };
    }

    function* generateForArch(arch) {
        yield* generateForNode(arch);
        yield* generateForNWJS(arch);
        yield* generateForElectron(arch);
    }

    if (environment.isWin) {
        yield* generateForArch("x64");
        yield* generateForArch("ia32");
    }
    else {
        yield* generateForArch();
    }

    // Actual:
    yield {};
}

function* generateOptions() {
    for (let runtimeOptions of generateRuntimeOptions()) {
        if (environment.isWin) {
            // V C++:
            yield runtimeOptions;
        }
        else {
            // Clang, Make
            yield _.extend({}, runtimeOptions, {preferClang: true, referMake: true});

            // Clang, Ninja
            yield _.extend({}, runtimeOptions, {preferClang: true});

            // g++, Make
            yield _.extend({}, runtimeOptions, {preferGnu: true, referMake: true});

            // g++, Ninja
            yield _.extend({}, runtimeOptions, {preferGnu: true});

            // Default:
            yield runtimeOptions;
        }
    }
}

let testRunner = {
    runCase: function (testCase, options) {
        for (let testOptions of generateOptions()) {
            let currentOptions = _.extend({}, testOptions, options || {});
            it("should build with: " + util.inspect(currentOptions), async function () {
                log.info("TEST", "Running case for options of: " + util.inspect(currentOptions));
                await testCase(currentOptions);
            });
        }
    }
};

module.exports = testRunner;