"use strict";
/* global describe,it */

var assert = require("assert");
var CMake = require("../lib/cMake");
var which = require("which");
var _ = require("lodash");
var path = require("path");

describe("CMake", function () {
    it("shoud rebuild prototype", function (done) {
        var cmake = new CMake({
            directory: path.resolve(path.join(__dirname, "../prototype"))
        });
        cmake.rebuild()
            .then(function() {
            })
            .nodeify(done);
    });
});