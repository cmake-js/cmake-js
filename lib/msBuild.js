"use strict";

var Generator = require("./generator");
var util = require("util");

function MSBuild(options) {
    Generator.call(this, options, "MSBuild");
}

util.inherits(MSBuild, Generator);

module.exports = MSBuild;