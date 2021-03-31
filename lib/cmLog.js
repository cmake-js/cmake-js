"use strict";
const log = require("npmlog");

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
        this.debug(cat + ": " + msg);
    }
    else {
        log.silly(cat, msg);
    }
};

CMLog.prototype.verbose = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(cat + ": " + msg);
    }
    else {
        log.verbose(cat, msg);
    }
};

CMLog.prototype.info = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(cat + ": " + msg);
    }
    else {
        log.info(cat, msg);
    }
};

CMLog.prototype.warn = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(cat + ": " + msg);
    }
    else {
        log.warn(cat, msg);
    }
};

CMLog.prototype.http = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(cat + ": " + msg);
    }
    else {
        log.http(cat, msg);
    }
};

CMLog.prototype.error = function(cat, msg) {
    if (this.options.noLog) {
        this.debug(cat + ": " + msg);
    }
    else {
        log.error(cat, msg);
    }
};

module.exports = CMLog;