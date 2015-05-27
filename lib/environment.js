"use strict";
var os = require("os");
var isIOJS = require("is-iojs");
var which = require("which");
var _ = require("lodash");

var environment = module.exports = {
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
                }
            }
            return this._isClangAvailable;
        }
    }
});