"use strict";
let lib = require("../../");
let environment = lib.environment;
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let _ = require("lodash");
let log = require("npmlog");
let util = require("util");

function* generateRuntimeOptions() {
    function* generateForNode(arch) {
        // Old:
        yield {
            runtime: "node",
            runtimeVersion: "0.10.36",
            arch: arch
        };

        // LTS:
        yield {
            runtime: "node",
            runtimeVersion: "4.2.2",
            arch: arch
        };

        // Current:
        if (environment.runtimeVersion !== "5.1.0") {
            yield {
                runtime: "node",
                runtimeVersion: "5.1.0",
                arch: arch
            };
        }
    }

    function* generateForIojs(arch) {
        // Latest:
        yield {
            runtime: "iojs",
            runtimeVersion: "3.3.1",
            arch: arch
        };
    }

    function* generateForNWJS(arch) {
        // Latest:
        yield {
            runtime: "nw",
            runtimeVersion: "0.12.3",
            arch: arch
        };
    }

    function* generateForElectron(arch) {
        // Latest:
        yield {
            runtime: "electron",
            runtimeVersion: "0.34.0",
            arch: arch
        };
    }

    function* generateForArch(arch) {
        yield* generateForNode(arch);
        yield* generateForIojs(arch);
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

let testRunner = {
    runCase: function (testCase, options) {
        for (let runtimeOptions of generateRuntimeOptions()) {
            let currentOptions = _.extend({}, runtimeOptions, options || {});
            it("should build with: " + util.inspect(currentOptions), function (done) {
                async(function*() {
                    log.info("TEST", "Running case for options of: " + util.inspect(currentOptions));
                    yield testCase(currentOptions);
                })().nodeify(done);
            });
        }
    }
};

module.exports = testRunner;