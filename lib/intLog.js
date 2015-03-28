"use strict";
var log = require("npmlog");
var debug = require("debug")("cmake-js");

function IntLog(options) {
    this.options = options || {};
}

Object.defineProperties(IntLog.prototype, {
    level: {
        get: function() {
            if (this.options.noLog) {
                return "silly";
            }
            else {
                return log.level;
            }
        }
    }
});

IntLog.prototype.silly = function(cat, msg) {
    if (this.options.noLog) {
        debug(msg);
    }
    else {
        log.silly(msg);
    }
};

IntLog.prototype.verbose = function(cat, msg) {
    if (this.options.noLog) {
        debug(msg);
    }
    else {
        log.verbose(msg);
    }
};

IntLog.prototype.info = function(cat, msg) {
    if (this.options.noLog) {
        debug(msg);
    }
    else {
        log.info(msg);
    }
};

IntLog.prototype.warn = function(cat, msg) {
    if (this.options.noLog) {
        debug(msg);
    }
    else {
        log.warn(msg);
    }
};

IntLog.prototype.http = function(cat, msg) {
    if (this.options.noLog) {
        debug(msg);
    }
    else {
        log.http(msg);
    }
};

IntLog.prototype.error = function(cat, msg) {
    if (this.options.noLog) {
        debug(msg);
    }
    else {
        log.error(msg);
    }
};

module.exports = IntLog;