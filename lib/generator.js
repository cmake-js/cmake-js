"use strict";
var Bluebird = require("bluebird");
var which = Bluebird.promisify(require("which"));
var fs = Bluebird.promisifyAll(require("fs"));

function Generator(options, name) {
    options = options || {};
    this.options = options;
    this.name = name;
    this._command = null;
    this._isCommandAvailable = null;
}

Generator.prototype.getCommand = function () {
    var self = this;
    if (!self._command) {
        var optionName = self.name.toLowerCase() + "-path";
        if (self.options[optionName]) {
            self._command = self.options[optionName];
            return Bluebird.resolve(self._command);
        }
        else {
            return Bluebird.resolve(self.determineCommand())
                .then(function (command) {
                    self._command = command;
                    return command;
                });
        }
    }
    else {
        return Bluebird.resolve(self._command);
    }
};

Generator.prototype.determineCommand = function () {
    throw new Error("Not implemented.");
};

Generator.prototype.isCommandAvailable = function () {
    var self = this;
    if (self._isCommandAvailable === null) {
        return self.getCommand()
            .then(function (command) {
                return which(command)
                    .then(function () {
                        self._isCommandAvailable = true;
                        return self._isCommandAvailable;
                    },
                    function () {
                        return fs.lstatAsync(command)
                            .then(function (stat) {
                                self._isCommandAvailable = !stat.isDirectory();
                                return self._isCommandAvailable;
                            },
                            function () {
                                self._isCommandAvailable = false;
                                return self._isCommandAvailable;
                            });
                    });
            });
    }
    else {
        return Bluebird.resolve(self._isCommandAvailable);
    }
};

module.exports = Generator;