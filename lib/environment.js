"use strict";
let os = require("os");
let isIOJS = require("is-iojs");
let which = require("which");
let _ = require("lodash");

let environment = module.exports = {
    moduleVersion: require("../package.json").version,
    platform: os.platform(),
    isWin: os.platform() === "win32",
    isLinux: os.platform() === "linux",
    isOSX: os.platform() === "darwin",
    arch: os.arch(),
    isX86: os.arch() === "ia32",
    isX64: os.arch() === "x64",
    isArm: os.arch() === "arm",
    runtime: isIOJS ? "iojs" : "node",
    runtimeVersion: process.versions.node,
    home: process.env[(os.platform() === "win32") ? "USERPROFILE" : "HOME"],
    EOL: os.EOL
};

Object.defineProperties(environment, {
    isPosix: {
        get: function () {
            return !this.isWin;
        }
    },
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
                    _.noop(e);
                }
            }
            return this._isNinjaAvailable;
        }
    },
    _isMakeAvailable: {
        value: null,
        writable: true
    },
    isMakeAvailable: {
        get: function() {
            if (this._isMakeAvailable === null) {
                this._isMakeAvailable = false;
                try {
                    if (which.sync("make")) {
                        this._isMakeAvailable = true;
                    }
                }
                catch (e) {
                    _.noop(e);
                }
            }
            return this._isMakeAvailable;
        }
    },
    _isGPPAvailable: {
        value: null,
        writable: true
    },
    isGPPAvailable: {
        get: function() {
            if (this._isGPPAvailable === null) {
                this._isGPPAvailable = false;
                try {
                    if (which.sync("g++")) {
                        this._isGPPAvailable = true;
                    }
                }
                catch (e) {
                    _.noop(e);
                }
            }
            return this._isGPPAvailable;
        }
    },
    _isClangAvailable: {
        value: null,
        writable: true
    },
    isClangAvailable: {
        get: function() {
            if (this._isClangAvailable === null) {
                this._isClangAvailable = false;
                try {
                    if (which.sync("clang++")) {
                        this._isClangAvailable = true;
                    }
                }
                catch (e) {
                    _.noop(e);
                }
            }
            return this._isClangAvailable;
        }
    }
});