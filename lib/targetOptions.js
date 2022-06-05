"use strict";

const environment = require("./environment");

function TargetOptions(options) {
    this.options = options || {};
}

Object.defineProperties(TargetOptions.prototype, {
    arch: {
        get: function () {
            return this.options.arch || environment.arch;
        }
    },
    isX86: {
        get: function () {
            return this.arch === "ia32" || this.arch === "x86";
        }
    },
    isX64: {
        get: function () {
            return this.arch === "x64";
        }
    },
    isArm: {
        get: function () {
            return this.arch === "arm";
        }
    },
    runtime: {
        get: function () {
            return this.options.runtime || environment.runtime;
        }
    },
    runtimeVersion: {
        get: function () {
            return this.options.runtimeVersion || environment.runtimeVersion;
        }
    }
});

module.exports = TargetOptions;