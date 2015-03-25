"use strict";
var environment = require("./environment");
var path = require("path");
var urljoin = require("url-join");
var fs = require("fs");

var dist = module.exports = {
    internalPath:
        path.join(
            environment.home,
            ".cmake-js",
            environment.isIOJS ? "iojs" : "node",
            environment.architecture,
            environment.runtimeVersion)
};

Object.defineProperties(dist, {
    _externalPath: {
        value: null,
        writable: true
    },
    externalPath: {
        get: function() {
            if (!this._externalPath) {
                if (environment.isIOJS) {
                    this._externalPath = "https://iojs.org/dist/v" + environment.runtimeVersion + "/";
                }
                else {
                    this._externalPath = "http://nodejs.org/dist/v" + environment.runtimeVersion + "/";
                }
            }
            return this._externalPath;
        }
    },
    
    _downloaded: {
        value: null,
        writable: true
    },
    downloaded: {
        get: function() {
            try {
                fs.lstatSync(this.internalPath);
                return true;
            }
            catch (e) {
                return false;
            }
        }
    }
});