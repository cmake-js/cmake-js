"use strict";
const CMake = require("./cMake");
const Dist = require("./dist");
const CMLog = require("./cmLog");
const appCMakeJSConfig = require("./appCMakeJSConfig");
const npmConfig = require("./npmConfig");
const path = require("path");
const isPlainObject = require("lodash.isplainobject");
const Toolset = require("./toolset");

function isNodeApi(log, projectRoot) {
    try {
        const projectPkgJson = require(path.join(projectRoot, 'package.json'))
        // Make sure the property exists
        return !!projectPkgJson?.binary?.napi_versions
    } catch (e) {
        log.silly("CFG", "'package.json' not found.");
        return false
    }
}

function BuildSystem(options) {
    this.options = options || {};
    this.options.directory = path.resolve(this.options.directory || process.cwd());
    this.options.out = path.resolve(this.options.out || path.join(this.options.directory, "build"));
    this.log = new CMLog(this.options);
    this.options.isNodeApi = isNodeApi(this.log, this.options.directory)
    const appConfig = appCMakeJSConfig(this.options.directory, this.log);
    const npmOptions = npmConfig(this.log);

    if (isPlainObject(npmOptions) && Object.keys(npmOptions).length) {
        this.options.runtimeDirectory = npmOptions["nodedir"];
        this.options.msvsVersion = npmOptions['msvs_version']
    }
    if (isPlainObject(appConfig)) {
        if (Object.keys(appConfig).length) {
            this.log.verbose("CFG", "Applying CMake.js config from root package.json:");
            this.log.verbose("CFG", JSON.stringify(appConfig));
            // Applying applications's config, if there is no explicit runtime related options specified
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

BuildSystem.prototype._ensureInstalled = async function () {
    try {
        await this.toolset.initialize(true);
        if (!this.options.isNodeApi) {
            await this.dist.ensureDownloaded();
        }
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

BuildSystem.prototype.install = function () {
    return this._ensureInstalled();
};

BuildSystem.prototype._invokeCMake = async function (method) {
    try {
        await this._ensureInstalled();
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

BuildSystem.prototype.getCmakeJsLibString = function () {
    return this._invokeCMake("getCmakeJsLibString");
};

BuildSystem.prototype.getCmakeJsIncludeString = function () {
    return this._invokeCMake("getCmakeJsIncludeString");
};

BuildSystem.prototype.getCmakeJsSrcString = function () {
    return this._invokeCMake("getCmakeJsSrcString");
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
