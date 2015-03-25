"use strict";

var Generator = require("./generator");
var util = require("util");

function Ninja(options) {
    Generator.call(this, options, "Ninja");
}

util.inherits(Ninja, Generator);

Ninja.prototype.determineCommand = function () {
    return "ninja";
};

module.exports = Ninja;