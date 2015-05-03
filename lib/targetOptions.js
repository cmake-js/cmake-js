"use strict";

var environment = require("./environment");
var _ = require("lodash");

function TargetOptions(options) {
    this.options = options || {};
}

Object.defineProperties(TargetOptions.prototype, {
    architecture: {
        get: function () {
            return this.options.arch || environment.architecture;
        }
    },
    isX86: {
        get: function () {
            return this.architecture === "ia32";
        }
    },
    isX64: {
        get: function () {
            return this.architecture === "x64";
        }
    },
    isArm: {
        get: function () {
            return this.architecture === "arm";
        }
    },
    runtime: {
        get: function () {
            return _.isString(this.options.runtime) ? this.options.runtime : environment.runtime;
        }
    },
    runtimeVersion: {
        get: function () {
            return this.options.runtimeVersion || environment.runtimeVersion;
        }
    }
});

module.exports = TargetOptions;