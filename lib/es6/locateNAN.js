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
    try {
        let stat = yield fs.statAsync(pjson);
        return stat.isFile();
    }
    catch (e) {
        _.noop(e);
        return false;
    }
});

let locateNAN = module.exports = async(function* (projectRoot) {
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