"use strict";
let assert = require("assert");
let lib = require("../../");
let BuildSystem = lib.BuildSystem;
let _ = require("lodash");
let path = require("path");
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let fs = require("fs-extra");

let testCases = {
    buildPrototypeWithDirectoryOption: async(function*(options) {
        options = _.extend({
            directory: path.resolve(path.join(__dirname, "./prototype"))
        }, options);
        let buildSystem = new BuildSystem(options);
        yield buildSystem.rebuild();
        assert.ok((yield fs.stat(path.join(__dirname, "prototype/build/Release/addon.node"))).isFile());
    }),
    buildPrototype2WithCWD: async(function*(options) {
        let cwd = process.cwd();
        process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
        let buildSystem = new BuildSystem(options);
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
        let buildSystem = new BuildSystem(options);
        if (!/visual studio/i.test(buildSystem.toolset.generator)) {
            let command = yield buildSystem.getConfigureCommand();
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
        let buildSystem = new BuildSystem(options);

        let command = yield buildSystem.getConfigureCommand();
        assert.notEqual(command.indexOf("-Dfoo=bar"), -1, "custom options added");
    }),
    configureWithCustomBuildOptions: async(function*(options) {
        options = _.extend({
            directory: path.resolve(path.join(__dirname, "./prototype")),
            buildArgs: ["-j7"]
        }, options);
        let buildSystem = new BuildSystem(options);

        let command = yield buildSystem.getBuildCommand();
        assert.notEqual(command.indexOf("-- -j7"), -1, "custom build options added");
    })
};

module.exports = testCases;
