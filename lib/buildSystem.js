"use strict";
var CMake = require("./cMake");
var Dist = require("./dist");
var CMLog = require("./cmLog");
var appCMakeJSConfig = require("./appCMakeJSConfig");
var path = require("path");
var _ = require("lodash");

function BuildSystem(options) {
    this.options = options || {};
    this.options.directory = path.resolve(this.options.directory || process.cwd());
    this.log = new CMLog(this.options);
    var appConfig = appCMakeJSConfig(this.options.directory, this.log);
    if (_.isPlainObject(appConfig)) {
        delete appConfig.directory;
        if (_.keys(appConfig).length) {
            this.log.info("CFG", "Applying CMake.js config from root package.json:");
            _.merge(appConfig,  _.pick(this.options,"runtime","runtimeVersion","arch")); // allow overriding of those properties
            _.extend(this.options, appConfig); 
            this.log.info("CFG", JSON.stringify(appConfig));
        }
    }
    this.log.verbose("CFG", "Build system options:");
    this.log.verbose("CFG", JSON.stringify(this.options));
    this.cmake = new CMake(this.options);
    this.dist = new Dist(this.options);
}

BuildSystem.prototype._ensureInstalled = function() {
    var self = this;
    return this.dist.ensureDownloaded()
        .catch(function(e) {
            self._showError(e);
            throw e;
        });
};

BuildSystem.prototype._showError = function(e) {
    if (this.log.level === "verbose" || this.log.level === "silly") {
        this.log.error("OMG", e.stack);
    }
    else {
        this.log.error("OMG", e.message);
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
            throw e;
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
