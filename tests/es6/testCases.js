"use strict";
let assert = require("assert");
let lib = require("../../");
let BuildSystem = lib.BuildSystem;
let path = require("path");
let fs = require("fs-extra");

let testCases = {
    buildPrototypeWithDirectoryOption: async function(options) {
        options = {
            directory: path.resolve(path.join(__dirname, "./prototype")),
            ...options
        };
        let buildSystem = new BuildSystem(options);
        await  buildSystem.rebuild();
        assert.ok((await fs.stat(path.join(__dirname, "prototype/build/Release/addon.node"))).isFile());
    },
    buildPrototype2WithCWD: async function(options) {
        let cwd = process.cwd();
        process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
        let buildSystem = new BuildSystem(options);
        try {
            await buildSystem.rebuild();
            assert.ok((await fs.stat(path.join(__dirname, "prototype2/build/Release/addon2.node"))).isFile());
        }
        finally {
            process.chdir(cwd);
        }
    },
    shouldConfigurePreC11Properly: async function(options) {
        options = {
            directory: path.resolve(path.join(__dirname, "./prototype")),
            std: "c++98",
            ...options
        };
        let buildSystem = new BuildSystem(options);
        if (!/visual studio/i.test(buildSystem.toolset.generator)) {
            let command = await buildSystem.getConfigureCommand();
            assert.equal(command.indexOf("-std=c++"), -1, "c++ version still forced");
        }
    },
    configureWithCustomOptions: async function(options) {
        options = {
            directory: path.resolve(path.join(__dirname, "./prototype")),
            cMakeOptions: {
              foo: "bar"
            },
            ...options
        };
        let buildSystem = new BuildSystem(options);

        let command = await buildSystem.getConfigureCommand();
        assert.notEqual(command.indexOf("-Dfoo=bar"), -1, "custom options added");
    }
};

module.exports = testCases;
