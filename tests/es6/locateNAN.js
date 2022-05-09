"use strict";
/* global describe,it */

let locateNAN = require("../../").locateNAN;
let path = require("path");
let assert = require("assert");

/*

Dependency tree for the test

fixtures/project
    dep1
        dep3
    @scope/dep2

*/

describe("locateNAN", function () {
    const PROJECT_DIR = path.resolve(__dirname, "..", "fixtures", "project");
    const NAN_DIR = path.join(PROJECT_DIR, "node_modules", "nan");

    it("should locate NAN from dependency", async function () {
        let dir = path.join(PROJECT_DIR, "node_modules", "dep-1");
        
        let nan = await locateNAN(dir);
        assert.equal(nan, NAN_DIR);
    });

    it("should locate NAN from nested dependency", async function () {
        let dir = path.join(PROJECT_DIR, "node_modules", "dep-1", "node_modules", "dep-3");

        let nan = await locateNAN(dir);
        assert.equal(nan, NAN_DIR);
        
    });

    it("should locate NAN from scoped dependency", async function () {
        let dir = path.join(PROJECT_DIR, "node_modules", "@scope", "dep-2");

        let nan = await locateNAN(dir);
        assert.equal(nan, NAN_DIR);
    });
});
