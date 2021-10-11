"use strict";
let CMake = require("./cMake");
let Dist = require("./dist");
let CMLog = require("./cmLog");
let appCMakeJSConfig = require("./appCMakeJSConfig");
let npmConfig = require("./npmConfig");
let path = require("path");
let _ = require("lodash");
let Toolset = require("./toolset");

function BuildSystem(options) {
    this.options = options || {};
    this.options.directory = path.resolve(this.options.directory || process.cwd());
    this.log = new CMLog(this.options);
    let appConfig = appCMakeJSConfig(this.options.directory, this.log);
    let npmOptions = npmConfig(this.log);

    if (_.isPlainObject(npmOptions) && _.keys(npmOptions).length) {
        this.options.runtimeDir = npmOptions["nodedir"];
    }
    if (_.isPlainObject(appConfig)) {
        if (_.keys(appConfig).length) {
            this.log.verbose("CFG", "Applying CMake.js config from root package.json:");
            this.log.verbose("CFG", JSON.stringify(appConfig));
            // Applying applications's config, if there is no explicit runtime related options specified
            this.options.runtime = this.options.runtime || appConfig.runtime;
            this.options.runtimeVersion = this.options.runtimeVersion || appConfig.runtimeVersion;
            this.options.arch = this.options.arch || appConfig.arch;
            this.options.ensureInstalled = appConfig.ensureInstalled === undefined ? true : appConfig.ensureInstalled;
            this.options.ensureDownloaded = appConfig.ensureDownloaded === undefined ? true : appConfig.ensureDownloaded;
            this.options.runtimeDir = this.options.runtimeDir || appConfig.runtimeDir;
        }
    }
    this.log.verbose("CFG", "Build system options:");
    this.log.verbose("CFG", JSON.stringify(this.options));
    this.cmake = new CMake(this.options);
    this.dist = new Dist(this.options);
    this.toolset = new Toolset(this.options);
}

BuildSystem.prototype._ensureInstalled = async function () {
    try {
        await this.toolset.initialize(true);
    }
    catch (e) {
        this._showError(e);
        throw e;
    }
};

BuildSystem.prototype._showError = function (e) {
    if (this.log === undefined) {
        // handle internal errors (init failed)
        console.error("OMG", e.stack);
        return;
    }
    if (this.log.level === "verbose" || this.log.level === "silly") {
        this.log.error("OMG", e.stack);
    }
    else {
        this.log.error("OMG", e.message);
    }
};

BuildSystem.prototype.install = async function () {
    await this._ensureInstalled();
    await this.dist.ensureDownloaded();
};

BuildSystem.prototype._invokeCMake = async function (method) {
    try {
        if (this.options.ensureInstalled === true) {
            await this._ensureInstalled();
        }
        if (this.options.ensureDownloaded === true) {
            await this.dist.ensureDownloaded();
        }
        return await this.cmake[method]();
    }
    catch (e) {
        this._showError(e);
        throw e;
    }
};

BuildSystem.prototype.getConfigureCommand = function () {
    return this._invokeCMake("getConfigureCommand");
};

BuildSystem.prototype.configure = function () {
    return this._invokeCMake("configure");
};

BuildSystem.prototype.getBuildCommand = function () {
    return this._invokeCMake("getBuildCommand");
};

BuildSystem.prototype.build = function () {
    return this._invokeCMake("build");
};

BuildSystem.prototype.getCleanCommand = function () {
    return this._invokeCMake("getCleanCommand");
};

BuildSystem.prototype.clean = function () {
    return this._invokeCMake("clean");
};

BuildSystem.prototype.reconfigure = function () {
    return this._invokeCMake("reconfigure");
};

BuildSystem.prototype.rebuild = function () {
    return this._invokeCMake("rebuild");
};

BuildSystem.prototype.compile = function () {
    return this._invokeCMake("compile");
};

module.exports = BuildSystem;
