"use strict";
/* global describe,it */

var assert = require("assert");
var CMake = require("../lib/cMake");
var _ = require("lodash");
var path = require("path");

describe("CMake", function () {
    it("should provide list of generators", function (done) {
        CMake.getGenerators()
            .then(function (gens) {
                assert(_.isArray(gens));
                assert(gens.length > 0);
                assert.equal(gens.filter(function (g) { return g.length; }).length, gens.length);
            })
            .nodeify(done);
    });

    it("should rebuild prototype", function (done) {
        this.timeout(30000);
        var cmake = new CMake({
            directory: path.resolve(path.join(__dirname, "./prototype"))
        });
        cmake.rebuild()
            .then(function () {
                var addon = require("./prototype/build/Release/addon.node");
                assert.equal(addon.add(3, 5), 8);
            })
            .nodeify(done);
    });
});