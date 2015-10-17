"use strict";
let _ = require("lodash");
let assert = require("assert");
let semver = require("semver");

let runtimePaths = {
    node: function (targetOptions) {
        if (semver.lt(targetOptions.runtimeVersion, "4.0.0")) {
            return {
                externalPath: "http://nodejs.org/dist/v" + targetOptions.runtimeVersion + "/",
                winLibDir: targetOptions.isX64 ? "x64" : "",
                winLibName: targetOptions.runtime + ".lib",
                tarPath: targetOptions.runtime + "-v" + targetOptions.runtimeVersion + ".tar.gz",
                headerOnly: false
            };
        }
        else {
            return {
                externalPath: "http://nodejs.org/dist/v" + targetOptions.runtimeVersion + "/",
                winLibDir: targetOptions.isX64 ? "win-x64" : "win-x86",
                winLibName: targetOptions.runtime + ".lib",
                tarPath: targetOptions.runtime + "-v" + targetOptions.runtimeVersion + "-headers.tar.gz",
                headerOnly: true
            };
        }
    },
    iojs: function (targetOptions) {
        return {
            externalPath: "https://iojs.org/dist/v" + targetOptions.runtimeVersion + "/",
            winLibDir: targetOptions.isX64 ? "win-x64" : "win-x86",
            winLibName: targetOptions.runtime + ".lib",
            tarPath: targetOptions.runtime + "-v" + targetOptions.runtimeVersion + ".tar.gz",
            headerOnly: false
        };
    },
    nw: function (targetOptions) {
        return {
            externalPath: "http://node-webkit.s3.amazonaws.com/v" + targetOptions.runtimeVersion + "/",
            winLibDir: targetOptions.isX64 ? "x64" : "",
            winLibName: targetOptions.runtime + ".lib",
            tarPath: "nw-headers-v" + targetOptions.runtimeVersion + ".tar.gz",
            headerOnly: false
        };
    },
    electron: function (targetOptions) {
        return {
            externalPath: "http://atom.io/download/atom-shell/v" + targetOptions.runtimeVersion + "/",
            winLibDir: targetOptions.isX64 ? "x64" : "",
            winLibName: "node.lib",
            tarPath: "node" + "-v" + targetOptions.runtimeVersion + ".tar.gz",
            headerOnly: false
        };
    },
    get: function (targetOptions) {
        assert(_.isObject(targetOptions));

        let runtime = targetOptions.runtime;
        let func = runtimePaths[runtime];
        let paths;
        if (_.isFunction(func) && _.isPlainObject(paths = func(targetOptions))) {
            return paths;
        }
        throw new Error("Unknown runtime: " + runtime);
    }
};

module.exports = runtimePaths;