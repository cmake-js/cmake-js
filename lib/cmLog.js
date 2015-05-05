"use strict";
var log = require("npmlog");

function CMLog(options) {
    this.options = options || {};
    this.debug = require("debug")(this.options.logName || "cmake-js");
}

Object.defineProperties(CMLog.prototype, {
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

CMLog.prototype.silly = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(msg);
    }
    else {
        log.silly(msg);
    }
};

CMLog.prototype.verbose = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(msg);
    }
    else {
        log.verbose(msg);
    }
};

CMLog.prototype.info = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(msg);
    }
    else {
        log.info(msg);
    }
};

CMLog.prototype.warn = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(msg);
    }
    else {
        log.warn(msg);
    }
};

CMLog.prototype.http = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(msg);
    }
    else {
        log.http(msg);
    }
};

CMLog.prototype.error = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(msg);
    }
    else {
        log.error(msg);
    }
};

module.exports = CMLog;