"use strict";
var os = require("os");
var isIOJS = require("is-iojs");

var environment = module.exports = {
    platform: os.platform(),
    isWin: os.platform() === "win32",
    isLinux: os.platform() === "linux",
    isOSX: os.platform() === "darwin",
    architecture: os.arch(),
    isX86: os.arch() === "x86",
    isX64: os.arch() === "x64",
    isIOJS: isIOJS,
    isNode: !isIOJS,
    runtimeVersion: process.versions.node
};