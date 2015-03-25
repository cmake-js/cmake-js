"use strict";

var Generator = require("./generator");
var util = require("util");

function Make(options) {
    Generator.call(this, options, "Make");
}

util.inherits(Make, Generator);

Make.prototype.determineCommand = function () {
    return process.env.MAKE ||
        (process.platform.indexOf("bsd") !== -1 &&
        process.platform.indexOf("kfreebsd") === -1 ? "gmake" : "make");
};

module.exports = Make;