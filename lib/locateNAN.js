"use strict";
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var path = require("path");

function isNANModule(dir) {
    var h = path.join(dir, "nan.h");
    return fs.statAsync(h)
        .then(function(stat) {
            return stat.isFile();
        },
        function() {
            return false;
        });
}

function isNodeJSProject(dir) {
    var pjson = path.join(dir, "package.json");
    return fs.statAsync(pjson)
        .then(function(stat) {
            return stat.isFile();
        },
        function() {
            return false;
        });
}

var locateNAN = module.exports = function(projectRoot) {
    return isNodeJSProject(projectRoot)
        .then(function(result) {
            if (!result) {
                return null;
            }
            var nanModulePath = path.join(projectRoot, "node_modules", "nan");
            return isNANModule(nanModulePath)
                .then(function(result) {
                    if (result) {
                        return nanModulePath;
                    }
                    // Goto upper level:
                    projectRoot = path.normalize(path.join(projectRoot, "..", ".."));
                    return locateNAN(projectRoot);
                });
        });
};