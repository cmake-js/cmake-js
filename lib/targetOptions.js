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
    isIOJS: {
        get: function () {
            return _.isBoolean(this.options.iojs) ? this.options.iojs : environment.isIOJS;
        }
    },
    runtimeVersion: {
        get: function () {
            return this.options.runtimeVersion || environment.runtimeVersion;
        }
    }
});

module.exports = TargetOptions;