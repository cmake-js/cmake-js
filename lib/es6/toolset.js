"use strict";
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let _ = require("lodash");
let TargetOptions = require("./targetOptions");
let environment = require("./environment");

function Toolset(options) {
    this.options = options || {};
    this.targetOptions = new TargetOptions(this.options);
}

Toolset.prototype.ensureAvailable = async(function*() {
    if (environment.isWin) {
        yield this.ensureAvailableWin();
    }
    else {
        this.ensureAvailablePosix();
    }
});

Toolset.prototype.ensureAvailablePosix = function () {
    if (environment.isGPPAvailable || environment.isClangAvailable) {
        return;
    }
    if (environment.isOSX) {
        throw new Error("C++ Compiler toolset is not available. Install Xcode Commandline Tools from Apple Dev Center, or install Clang with homebrew by invoking: 'brew install llvm --with-clang --with-asan'.");
    }
    else {
        throw new Error("C++ Compiler toolset is not available. Install proper compiler toolset with your package manager, eg. 'sudo apt-get install g++'.");
    }
};

Toolset.prototype.ensureAvailableWin = async(function*() {

});

module.exports = Toolset;