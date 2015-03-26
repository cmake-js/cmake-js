"use strict";
var cli = require("cli");
var which = require("which");
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs"));
var path = require("path");
var rimraf = Bluebird.promisify(require("rimraf"));
var log = require('npmlog');
var _ = require("lodash");
var environment = require("./environment");
var dist = require("./dist");

function CMake(options) {
    this.options = options || {};
    this.projectRoot = this.options.directory || process.cwd();
    this.workDir = path.join(this.projectRoot, "build");
    this.buildType = this.options.debug ? "Debug" : "Release";
    this.buildDir = path.join(this.workDir, this.buildType);
    this._isAvailable = null;
}

Object.defineProperties(CMake.prototype, {
    path: {
        get: function () {
            return this.options["cmake-path"] || "cmake";
        }
    },
    isAvailable: {
        get: function () {
            if (this._isAvailable === null) {
                this._isAvailable = CMake.isAvailable(this.options);
            }
            return this._isAvailable;
        }
    }
});

CMake.isAvailable = function (options) {
    options = options || {};
    try {
        if (options["cmake-path"]) {
            var stat = fs.lstatSync(options["cmake-path"]);
            return !stat.isDirectory();
        }
        else {
            which.sync("cmake");
            return true;
        }
    }
    catch (e) {
    }
    return false;
};

CMake.prototype.verifyIfAvailable = function () {
    if (!this.isAvailable) {
        throw new Error("CMake is not found.");
    }
};

CMake.prototype.configure = function () {
    this.verifyIfAvailable();

    var useNinja = !this.options["prefer-native"] && environment.isNinjaAvailable;
    var command = this.path;
    command += " " + this.projectRoot;
    if (useNinja) {
        command += " -GNinja";
    }
    var D = [];
    D.push({ "CMAKE_LIBRARY_OUTPUT_DIRECTORY": this.buildDir });
    D.push({ "CMAKE_BUILD_TYPE": this.buildType });

    var nodeH = path.join(dist.internalPath, "/src");
    var v8H = path.join(dist.internalPath, "/deps/v8/include");
    var incPaths = [nodeH, v8H];

    D.push({ "CMAKE_JS_INC": incPaths.join(";") });

    // x86 vs 64: http://stackoverflow.com/questions/5334095/cmake-multiarchitecture-compilation
    if (environment.isWin) {
        if (environment.isX64) {
            D.push({ "CMAKE_SHARED_LINKER_FLAGS": "/machine:x64" });
            // TODO: x64 node.lib
        }
        else if (environment.isX86) {
            // TODO: x86 node.lib
            _.noop();
        }
    }

    command += " " +
    D.map(function (p) {
        return "-D" + _.keys(p)[0] + "=\"" + _.values(p)[0] + "\"";
    }).join(" ");

    try {
        fs.mkdirSync(this.workDir);
    }
    catch (e) {
    }
    process.chdir(this.workDir);

    return this._run(command);
};

CMake.prototype.ensureConfigured = function () {
    var self = this;
    return fs.lstatAsync(path.join(self.workDir, "CMakeCache.txt"))
        .then(_.noop,
        function () {
            // Not found:
            return self.configure();
        });
};

CMake.prototype.build = function () {
    this.verifyIfAvailable();
    var self = this;
    return self.ensureConfigured()
        .then(function () {
            return self._run(self.path + " --build " + self.workDir);
        });
};

CMake.prototype.clean = function () {
    return rimraf(this.workDir);
};

CMake.prototype.rebuild = function () {
    var self = this;
    return self.clean()
        .then(function () {
            return self.build();
        });
};

CMake.prototype._run = function (command) {
    log.info("RUN", command);
    return new Bluebird(function (resolve, reject) {
        cli.exec(command,
            function (output) {
                output.forEach(function (line) {
                    log.info("", line);
                });
                resolve();
            },
            function (err) {
                reject(new Error(err.message));
            });
    });
};

module.exports = CMake;