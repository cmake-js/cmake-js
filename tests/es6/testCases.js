"use strict";
const assert = require("assert");
const lib = require("../../");
const BuildSystem = lib.BuildSystem;
const _ = require("lodash");
const path = require("path");
const Bluebird = require("bluebird");
const async = Bluebird.coroutine;
const fs = require("fs-extra");

const testCases = {
    buildPrototypeWithDirectoryOption: async(function*(options) {
        options = _.extend({
            directory: path.resolve(path.join(__dirname, "./prototype"))
        }, options);
        const buildSystem = new BuildSystem(options);
        yield buildSystem.rebuild();
        assert.ok((yield fs.stat(path.join(__dirname, "prototype/build/Release/addon.node"))).isFile());
    }),
    buildPrototype2WithCWD: async(function*(options) {
        const cwd = process.cwd();
        process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
        const buildSystem = new BuildSystem(options);
        try {
            yield buildSystem.rebuild();
            assert.ok((yield fs.stat(path.join(__dirname, "prototype2/build/Release/addon2.node"))).isFile());
        }
        finally {
            process.chdir(cwd);
        }
    }),
    shouldConfigurePreC11Properly: async(function*(options) {
        options = _.extend({
            directory: path.resolve(path.join(__dirname, "./prototype")),
            std: "c++98"
        }, options);
        const buildSystem = new BuildSystem(options);
        if (!/visual studio/i.test(buildSystem.toolset.generator)) {
            const command = yield buildSystem.getConfigureCommand();
            assert.equal(command.indexOf("-std=c++11"), -1, "c++11 still forced");
        }
    }),
    configureWithCustomOptions: async(function*(options) {
        options = _.extend({
            directory: path.resolve(path.join(__dirname, "./prototype")),
            cMakeOptions: {
              foo: "bar"
            }
        }, options);
        const buildSystem = new BuildSystem(options);

        const command = yield buildSystem.getConfigureCommand();
        assert.notEqual(command.indexOf("-Dfoo=bar"), -1, "custom options added");
    })
};

module.exports = testCases;
