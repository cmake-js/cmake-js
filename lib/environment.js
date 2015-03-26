"use strict";
var os = require("os");
var isIOJS = require("is-iojs");
var which = require("which");

var environment = module.exports = {
    platform: os.platform(),
    isWin: os.platform() === "win32",
    isLinux: os.platform() === "linux",
    isOSX: os.platform() === "darwin",
    architecture: os.arch(),
    isX86: os.arch() === "ia32",
    isX64: os.arch() === "x64",
    isArm: os.arch() === "arm",
    isIOJS: isIOJS,
    isNode: !isIOJS,
    runtimeVersion: process.versions.node,
    home: process.env[(os.platform() === "win32") ? "USERPROFILE" : "HOME"]
};

Object.defineProperties(environment, {
    _isNinjaAvailable: {
        value: null,
        writable: true
    },
    isNinjaAvailable: {
        get: function() {
            if (this._isNinjaAvailable === null) {
                this._isNinjaAvailable = false;
                try {
                    if (which.sync("ninja")) {
                        this._isNinjaAvailable = true;
                    }
                }
                catch (e) {
                }
            }
            return this._isNinjaAvailable;
        }
    }
});