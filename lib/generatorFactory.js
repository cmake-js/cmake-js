"use strict";
var Make = require("./make");
var Ninja = require("./ninja");
var MSBuild = require("./msBuild");
var environment = require("./environment");
var Bluebird = require("bluebird");

var generatorFactory = {
    create: function (options) {
        options = options || {};
        var find = new Bluebird(function (resolve, reject) {
            if (options.G) {
                var value = options.G.toLowerCase();
                var x64 = value.length > 3 && value[value.length - 2] === "6" && value[value.length - 1] === "4";
                if (environment.isWin) {
                    if (x64 && !environment.isX64 || !x64 && environment.isX64) {
                        reject(new Error(
                            "System architecture of '" +
                            environment.architecture +
                            "' is not the same as build architecture '" +
                            (x64 ? "x64" : "ia32") +
                            "'."));
                        return;
                    }
                }
                if (value.indexOf("visual studio") === 0) {
                    resolve(new MSBuild());
                }
                else if (value.indexOf("ninja") === 0) {
                    resolve(new Ninja());
                }
                else if (value.indexOf("unix makefiles") === 0 || (value.indexOf("gmake") >= 0 && value.indexOf("=") === -1)) {
                    resolve(new Make());
                }
            }
            else {
                var ninja = new Ninja();
                ninja.isCommandAvailable()
                    .then(function(avail) {
                        if (avail) {
                            resolve(ninja);
                        }
                        else if (environment.isWin) {
                            resolve(new MSBuild());
                        }
                        else {
                            resolve(new Make());
                        }
                    },
                    function(e) {
                        reject(e);
                    });
            }
        });

        var result;
        return find.then(function(generator) {
            result = generator;
            return generator.isCommandAvailable()
                .then(function(avail) {
                    if (!avail) {
                        throw new Error("Generator '" + result.name + "' is not available.");
                    }
                    return result;
                });
        });
    }
};

module.exports = generatorFactory;