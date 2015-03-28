"use strict";
var CMake = require("./cMake");
var dist = require("./dist");
var IntLog = require("./intLog");

function BuildSystem(options) {
    this.options = options || {};
    this.cmake = new CMake(options);
    this.log = new IntLog(options);
}

BuildSystem.prototype._ensureInstalled = function() {
    return dist.ensureDownloaded(this.options);
};

BuildSystem.prototype._showError = function(e) {
    this.log.error("OMG", e.message);
    if (this.log.level === "verbose" || this.log.level === "silly") {
        this.log.error("OMG", e.stack);
    }
};

BuildSystem.prototype.install = function() {
    var self = this;
    return self._ensureInstalled();
};

BuildSystem.prototype._invokeCMake = function(method) {
    var self = this;
    return self._ensureInstalled()
        .then(function() {
            return self.cmake[method]();
        })
        .catch(function(e) {
            self._showError(e);
        });
};

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

module.exports = BuildSystem;