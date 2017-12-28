"use strict";
var environment = require("./environment");
var _ = require("lodash");
function TargetOptions(options) {
  this.options = options || {};
}
Object.defineProperties(TargetOptions.prototype, {
  arch: {get: function() {
      return this.options.arch || environment.arch;
    }},
  isX86: {get: function() {
      return this.arch === "ia32";
    }},
  isX64: {get: function() {
      return this.arch === "x64";
    }},
  isArm: {get: function() {
      return this.arch === "arm";
    }},
  runtime: {get: function() {
      return this.options.runtime || environment.runtime;
    }},
  runtimeVersion: {get: function() {
      return this.options.runtimeVersion || environment.runtimeVersion;
    }},
  mirrorNode: {get: function() {
      return (this.options.mirrors && this.options.mirrors.node) || environment.mirrors.node;
    }},
  mirrorIojs: {get: function() {
      return (this.options.mirrors && this.options.mirrors.iojs) || environment.mirrors.iojs;
    }},
  mirrorNw: {get: function() {
      return (this.options.mirrors && this.options.mirrors.nw) || environment.mirrors.nw;
    }},
  mirrorElectron: {get: function() {
      return (this.options.mirrors && this.options.mirrors.electron) || environment.mirrors.electron;
    }}
});
module.exports = TargetOptions;

//# sourceMappingURL=targetOptions.js.map
