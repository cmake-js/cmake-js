"use strict";

let environment = require("./environment");
let _ = require("lodash");

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
            if (this.runtime != environment.runtime && !this.options.runtimeVersion) {
                throw new Error(`Missing runtimeVersion. It must be specified when specifying the runtime`)
            } else {
                return this.options.runtimeVersion || environment.runtimeVersion;
            }
        }
    }
});

module.exports = TargetOptions;