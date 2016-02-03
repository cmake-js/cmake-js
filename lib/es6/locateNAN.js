"use strict";
let Bluebird = require("bluebird");
let fs = Bluebird.promisifyAll(require("fs-extra"));
let path = require("path");
let async = Bluebird.coroutine;
let _ = require("lodash");

let isNANModule = async(function* (dir) {
    let h = path.join(dir, "nan.h");
    try {
        let stat = yield fs.statAsync(h);
        return stat.isFile();
    }
    catch (e) {
        _.noop(e);
        return false;
    }
});

let isNodeJSProject = async(function* (dir) {
    let pjson = path.join(dir, "package.json");
    let node_modules = path.join(dir, "node_modules");
    try {
        let stat = yield fs.statAsync(pjson);
        if (stat.isFile()) {
            return true;
        }
        stat = yield fs.statAsync(node_modules);
        if (stat.isDirectory()) {
            return true;
        }
    }
    catch (e) {
        _.noop(e);
    }
    return false;
});

let locateNAN = module.exports = async(function* (projectRoot) {
    if (locateNAN.__projectRoot) {
        projectRoot = locateNAN.__projectRoot;
    }
    let result = yield isNodeJSProject(projectRoot);
    if (!result) {
        return null;
    }
    let nanModulePath = path.join(projectRoot, "node_modules", "nan");
    result = yield isNANModule(nanModulePath);
    if (result) {
        return nanModulePath;
    }

    // Goto upper level:
    projectRoot = path.normalize(path.join(projectRoot, "..", ".."));
    return yield locateNAN(projectRoot);
});