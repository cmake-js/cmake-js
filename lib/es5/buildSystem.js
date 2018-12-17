"use strict";
var CMake = require("./cMake");
var Dist = require("./dist");
var CMLog = require("./cmLog");
var appCMakeJSConfig = require("./appCMakeJSConfig");
var path = require("path");
var _ = require("lodash");
var Promise = require("bluebird");
var async = Promise.coroutine;
var Toolset = require("./toolset");
function BuildSystem(options) {
  this.options = options || {};
  this.options.directory = path.resolve(this.options.directory || process.cwd());
  this.log = new CMLog(this.options);
  var appConfig = appCMakeJSConfig(this.options.directory, this.log);
  if (_.isPlainObject(appConfig)) {
    if (_.keys(appConfig).length) {
      this.log.verbose("CFG", "Applying CMake.js config from root package.json:");
      this.log.verbose("CFG", JSON.stringify(appConfig));
      this.options.runtime = this.options.runtime || appConfig.runtime;
      this.options.runtimeVersion = this.options.runtimeVersion || appConfig.runtimeVersion;
      this.options.arch = this.options.arch || appConfig.arch;
    }
  }
  this.log.verbose("CFG", "Build system options:");
  this.log.verbose("CFG", JSON.stringify(this.options));
  this.cmake = new CMake(this.options);
  this.dist = new Dist(this.options);
  this.toolset = new Toolset(this.options);
}
BuildSystem.prototype._ensureInstalled = async($traceurRuntime.initGeneratorFunction(function $__1() {
  var e;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.pushTry(9, null);
          $ctx.state = 12;
          break;
        case 12:
          $ctx.state = 2;
          return this.toolset.initialize(true);
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = 6;
          return this.dist.ensureDownloaded();
        case 6:
          $ctx.maybeThrow();
          $ctx.state = 8;
          break;
        case 8:
          $ctx.popTry();
          $ctx.state = -2;
          break;
        case 9:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 15;
          break;
        case 15:
          this._showError(e);
          throw e;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__1, this);
}));
BuildSystem.prototype._showError = function(e) {
  if (this.log.level === "verbose" || this.log.level === "silly") {
    this.log.error("OMG", e.stack);
  } else {
    this.log.error("OMG", e.message);
  }
};
BuildSystem.prototype.install = function() {
  return this._ensureInstalled();
};
BuildSystem.prototype._invokeCMake = async($traceurRuntime.initGeneratorFunction(function $__2(method) {
  var $__3,
      $__4,
      $__5,
      $__6,
      e;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.pushTry(13, null);
          $ctx.state = 16;
          break;
        case 16:
          $ctx.state = 2;
          return this._ensureInstalled();
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 4:
          $__3 = this.cmake;
          $__4 = $__3[method];
          $__5 = $__4.call($__3);
          $ctx.state = 10;
          break;
        case 10:
          $ctx.state = 6;
          return $__5;
        case 6:
          $__6 = $ctx.sent;
          $ctx.state = 8;
          break;
        case 8:
          $ctx.returnValue = $__6;
          $ctx.state = -2;
          break;
        case 12:
          $ctx.popTry();
          $ctx.state = -2;
          break;
        case 13:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 19;
          break;
        case 19:
          this._showError(e);
          throw e;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__2, this);
}));
BuildSystem.prototype.getConfigureCommand = function() {
  return this._invokeCMake("getConfigureCommand");
};
BuildSystem.prototype.configure = function() {
  return this._invokeCMake("configure");
};
BuildSystem.prototype.getBuildCommand = function() {
  return this._invokeCMake("getBuildCommand");
};
BuildSystem.prototype.build = function() {
  return this._invokeCMake("build");
};
BuildSystem.prototype.getCleanCommand = function() {
  return this._invokeCMake("getCleanCommand");
};
BuildSystem.prototype.clean = function() {
  return this._invokeCMake("clean");
};
BuildSystem.prototype.reconfigure = function() {
  return this._invokeCMake("reconfigure");
};
BuildSystem.prototype.rebuild = function() {
  return this._invokeCMake("rebuild");
};
BuildSystem.prototype.compile = function() {
  return this._invokeCMake("compile");
};
module.exports = BuildSystem;

//# sourceMappingURL=buildSystem.js.map
