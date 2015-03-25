"use strict";
/* global describe,it */

var assert = require("assert");
var CMake = require("../lib/cMake");
var which = require("which");
var _ = require("lodash");

describe("CMake", function () {
    it("shoud provide list of generators", function (done) {
        CMake.getGenerators()
            .then(function (gens) {
                assert(_.isArray(gens));
                assert(gens.length > 0);
                assert.equal(gens.filter(function (g) { return g.length; }).length, gens.length);
            })
            .nodeify(done);
    });
});