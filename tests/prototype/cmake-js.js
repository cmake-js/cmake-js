/*
Notes:
Architecture:
    http://stackoverflow.com/questions/5334095/cmake-multiarchitecture-compilation
MSBuild location:
    http://blogs.msdn.com/b/visualstudio/archive/2013/07/24/msbuild-is-now-part-of-visual-studio.aspx
 */

var Bluebird = require("bluebird");
var cli = require("cli");
cli.enable("status");
var path = require("path");
var fs = Bluebird.promisifyAll(require("fs"));
var which = Bluebird.promisifyAll(require("which"));
var _ = require("lodash");

// Include:
function getUserHome() {
    return process.env[(process.platform == "win32") ? "USERPROFILE" : "HOME"];
}

var nodeH = path.join(getUserHome(), ".node-gyp/1.6.2/src");
var v8H = path.join(getUserHome(), ".node-gyp/1.6.2/deps/v8/include");

var sourceDir = __dirname;

// Build dir:
var buildDir = "build";
try {
    fs.mkdirSync(buildDir);
}
catch (e) {
}
process.chdir(buildDir);

// Build type:
var buildType = "Release";

// Build system:
var ninja = false;
try {
    which.sync("ninja");
    ninja = true;
}
catch (e) {
}

var msbuild = false;
try {
    which.sync("msbuild");
    msbuild = true;
}
catch (e) {
}

var make = false;
try {
    which.sync("make");
    make = true;
}
catch (e) {
}

var buildCommand;
if (ninja) {
    buildCommand = "ninja";
}
else if (make) {
    buildCommand = "make";
}
else if (msbuild) {
    buildCommand = "msbuild";
}

if (!buildCommand) {
    cli.fatal("Cannot detect build toolset.");
}

// Rename lib:
function renameResult() {
    //^(?:lib)?(.*)(?:(?:\.so)|(?:\.dynlib)|(?:\.dll))
    fs.readdirSync(buildType).filter(function(f) {
        var result = /^(?:lib)?(.*)(?:(?:\.so)|(?:\.dynlib)|(?:\.dll))/.exec(f);
        if (_.isArray(result)) {
            var fn = result[0];
            var newFn = result[1] + ".node";
            fs.renameSync(path.join(buildType, fn), path.join(buildType, newFn));
        }
    });
}

// Invoke CMake

var command =
    "cmake " +
    "-D CMAKE_LIBRARY_OUTPUT_DIRECTORY=" + buildType +" " +
    "-D CMAKE_BUILD_TYPE=" + buildType +" " +
    "-D CMAKE_JS_INC=\"" + v8H + ";" + nodeH + "\" " +
    (ninja ? "-G Ninja " : "") +
    sourceDir +
    " && " + buildCommand;
console.log(command);

cli.exec(command,
    function (output) {
        console.log(output);

        renameResult();
    },
    function (err, output) {
        cli.fatal(err.message + "\n" + output);
    });

