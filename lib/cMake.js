"use strict";
const which = require("which");
const fs = require("fs-extra");
const path = require("path");
const environment = require("./environment");
const Dist = require("./dist");
const CMLog = require("./cmLog");
const TargetOptions = require("./targetOptions");
const processHelpers = require("./processHelpers");
const locateNAN = require("./locateNAN");
const locateNodeApi = require("./locateNodeApi");
const npmConfigData = require("rc")("npm");
const Toolset = require("./toolset");
const headers = require('node-api-headers');

function CMake(options) {
    this.options = options || {};
    this.log = new CMLog(this.options);
    this.dist = new Dist(this.options);
    this.projectRoot = path.resolve(this.options.directory || process.cwd());
    this.workDir = path.resolve(this.options.out || path.join(this.projectRoot, "build"));
    this.config = this.options.config || (this.options.debug ? "Debug" : "Release");
    this.buildDir = path.join(this.workDir, this.config);
    this._isAvailable = null;
    this.targetOptions = new TargetOptions(this.options);
    this.toolset = new Toolset(this.options);
    this.cMakeOptions = this.options.cMakeOptions || {};
    this.extraCMakeArgs = this.options.extraCMakeArgs || [];
    this.silent = !!options.silent;
}

Object.defineProperties(CMake.prototype, {
    path: {
        get: function () {
            return this.options.cmakePath || "cmake";
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
        if (options.cmakePath) {
            const stat = fs.lstatSync(options.cmakePath);
            return !stat.isDirectory();
        }
        else {
            which.sync("cmake");
            return true;
        }
    }
    catch (e) {
        // Ignore
    }
    return false;
};

CMake.getGenerators = async function (options, log) {
    const arch = " [arch]";
    options = options || {};
    const gens = [];
    if (CMake.isAvailable(options)) {
        // try parsing machine-readable capabilities (available since CMake 3.7)
        try {
            const stdout = await processHelpers.execFile([options.cmakePath || "cmake", "-E", "capabilities"]);
            const capabilities = JSON.parse(stdout);
            return capabilities.generators.map(x => x.name);
        }
        catch (error) {
            if (log) {
                log.verbose("TOOL", "Failed to query CMake capabilities (CMake is probably older than 3.7)");
            }
        }

        // fall back to parsing help text
        const stdout = await processHelpers.execFile([options.cmakePath || "cmake", "--help"]);
        const hasCr = stdout.includes("\r\n");
        const output = hasCr ? stdout.split("\r\n") : stdout.split("\n");
        let on = false;
        output.forEach(function (line, i) {
            if (on) {
                const parts = line.split("=");
                if ((parts.length === 2 && parts[0].trim()) ||
                    (parts.length === 1 && i !== output.length - 1 && output[i + 1].trim()[0] === "=")) {
                    let gen = parts[0].trim();
                    if (gen.endsWith(arch)) {
                        gen = gen.substr(0, gen.length - arch.length);
                    }
                    gens.push(gen);
                }
            }
            if (line.trim() === "Generators") {
                on = true;
            }
        });
    }
    else {
        throw new Error("CMake is not installed. Install CMake.");
    }
    return gens;
};

CMake.prototype.getGenerators = function () {
    return CMake.getGenerators(this.options, this.log);
};

CMake.prototype.verifyIfAvailable = function () {
    if (!this.isAvailable) {
        throw new Error("CMake executable is not found. Please use your system's package manager to install it, or you can get installers from there: http://cmake.org.");
    }
};

CMake.prototype.getConfigureCommand = async function () {

    // Create command:
    let command = [this.path, this.projectRoot, "--no-warn-unused-cli"];

    const D = [];

    // CMake.js watermark
    D.push({"CMAKE_JS_VERSION": environment.cmakeJsVersion});

    // Build configuration:
    D.push({"CMAKE_BUILD_TYPE": this.config});
    if (environment.isWin) {
        D.push({"CMAKE_RUNTIME_OUTPUT_DIRECTORY": this.workDir});
    }
    else if (this.workDir.endsWith(this.config)) {
        D.push({"CMAKE_LIBRARY_OUTPUT_DIRECTORY": this.workDir});
    }
    else {
        D.push({"CMAKE_LIBRARY_OUTPUT_DIRECTORY": this.buildDir});
    }

    // In some configurations MD builds will crash upon attempting to free memory.
    // This tries to encourage MT builds which are larger but less likely to have this crash.
    D.push({"CMAKE_MSVC_RUNTIME_LIBRARY": "MultiThreaded$<$<CONFIG:Debug>:Debug>"})

    // Includes:
    const includesString = await this.getCmakeJsIncludeString();
    D.push({ "CMAKE_JS_INC": includesString });

    // Sources:
    const srcsString = this.getCmakeJsSrcString();
    D.push({ "CMAKE_JS_SRC": srcsString });

    // Runtime:
    D.push({"NODE_RUNTIME": this.targetOptions.runtime});
    D.push({"NODE_RUNTIMEVERSION": this.targetOptions.runtimeVersion});
    D.push({"NODE_ARCH": this.targetOptions.arch});

    if (environment.isOSX) {
        if (this.targetOptions.arch) {
            let xcodeArch = this.targetOptions.arch
            if (xcodeArch === 'x64') xcodeArch = 'x86_64'
            D.push({CMAKE_OSX_ARCHITECTURES: xcodeArch})
        }
    }

    // Custom options
    for (const [key, value] of Object.entries(this.cMakeOptions)) {
        D.push({ [key]: value });
    }

    // Toolset:
    await this.toolset.initialize(false);

    const libsString = this.getCmakeJsLibString()
    D.push({ "CMAKE_JS_LIB": libsString });

    if (environment.isWin) {
        const nodeLibDefPath = this.getNodeLibDefPath()
        if (nodeLibDefPath) {
            const nodeLibPath = path.join(this.workDir, 'node.lib')
            D.push({ CMAKE_JS_NODELIB_DEF: nodeLibDefPath })
            D.push({ CMAKE_JS_NODELIB_TARGET: nodeLibPath })
        }
    }

    if (this.toolset.generator) {
        command.push("-G", this.toolset.generator);
    }
    if (this.toolset.platform) {
        command.push("-A", this.toolset.platform);
    }
    if (this.toolset.toolset) {
        command.push("-T", this.toolset.toolset);
    }
    if (this.toolset.cppCompilerPath) {
        D.push({"CMAKE_CXX_COMPILER": this.toolset.cppCompilerPath});
    }
    if (this.toolset.cCompilerPath) {
        D.push({"CMAKE_C_COMPILER": this.toolset.cCompilerPath});
    }
    if (this.toolset.compilerFlags.length) {
        D.push({"CMAKE_CXX_FLAGS": this.toolset.compilerFlags.join(" ")});
    }
    if (this.toolset.linkerFlags.length) {
        D.push({"CMAKE_SHARED_LINKER_FLAGS": this.toolset.linkerFlags.join(" ")});
    }
    if (this.toolset.makePath) {
        D.push({"CMAKE_MAKE_PROGRAM": this.toolset.makePath});
    }

    // Load NPM config
    for (const [key, value] of Object.entries(npmConfigData)) {
        if (key.startsWith("cmake_")) {
            const sk = key.substr(6);
            if (sk && value) {
                D.push({ [sk]: value });
            }
        }
    }

    command = command.concat(D.map(function (p) {
            return "-D" + Object.keys(p)[0] + "=" + Object.values(p)[0];
        }));

    return command.concat(this.extraCMakeArgs);
};

CMake.prototype.getCmakeJsLibString = function () {

    const libs = []
    if (environment.isWin) {
        const nodeLibDefPath = this.getNodeLibDefPath()
        if (nodeLibDefPath) {
            libs.push(path.join(this.workDir, 'node.lib'))
        } else {
            libs.push(...this.dist.winLibs)
        }
    }
    return libs.join(";");
};

CMake.prototype.getCmakeJsIncludeString = async function () {
    let incPaths = [];
    if (!this.options.isNodeApi) {
        // Include and lib:
        if (this.dist.headerOnly) {
            incPaths = [path.join(this.dist.internalPath, "/include/node")];
        }
        else {
            const nodeH = path.join(this.dist.internalPath, "/src");
            const v8H = path.join(this.dist.internalPath, "/deps/v8/include");
            const uvH = path.join(this.dist.internalPath, "/deps/uv/include");
            incPaths = [nodeH, v8H, uvH];
        }

        // NAN
        const nanH = await locateNAN(this.projectRoot);
        if (nanH) {
            incPaths.push(nanH);
        }
    } else {
        // Base headers
        const apiHeaders = require('node-api-headers')
        incPaths.push(apiHeaders.include_dir)

        // Node-api
        const napiH = await locateNodeApi(this.projectRoot)
        if (napiH) {
            incPaths.push(napiH)
        }
    }

    return incPaths.join(";");
};

CMake.prototype.getCmakeJsSrcString = function () {
    const srcPaths = [];
    if (environment.isWin) {
        const delayHook = path.normalize(path.join(__dirname, 'cpp', 'win_delay_load_hook.cc'));

        srcPaths.push(delayHook.replace(/\\/gm, '/'));
    }

    return srcPaths.join(";");
};

CMake.prototype.getNodeLibDefPath = function () {
    return environment.isWin && this.options.isNodeApi ? headers.def_paths.node_api_def : undefined
}

CMake.prototype.configure = async function () {
    this.verifyIfAvailable();

    this.log.info("CMD", "CONFIGURE");
    const listPath = path.join(this.projectRoot, "CMakeLists.txt");
    const command = await this.getConfigureCommand();

    try {
        await fs.lstat(listPath);
    }
    catch (e) {
        throw new Error("'" + listPath + "' not found.");
    }

    try {
        await fs.ensureDir(this.workDir);
    }
    catch (e) {
        // Ignore
    }

    const cwd = process.cwd();
    process.chdir(this.workDir);
    try {
        await this._run(command);
    }
    finally {
        process.chdir(cwd);
    }
};

CMake.prototype.ensureConfigured = async function () {
    try {
        await fs.lstat(path.join(this.workDir, "CMakeCache.txt"));
    }
    catch (e) {
        await this.configure();
    }
};

CMake.prototype.getBuildCommand = function () {
    const command = [this.path, "--build", this.workDir, "--config", this.config];
    if (this.options.target) {
        command.push("--target", this.options.target);
    }
    if (this.options.parallel) {
        command.push("--parallel", this.options.parallel);
    }
    return Promise.resolve(command.concat(this.extraCMakeArgs));
};

CMake.prototype.build = async function () {
    this.verifyIfAvailable();

    await this.ensureConfigured();
    const buildCommand = await this.getBuildCommand();
    this.log.info("CMD", "BUILD");
    await this._run(buildCommand);
};

CMake.prototype.getCleanCommand = function () {
    return [this.path, "-E", "remove_directory", this.workDir].concat(this.extraCMakeArgs);
};

CMake.prototype.clean = function () {
    this.verifyIfAvailable();

    this.log.info("CMD", "CLEAN");
    return this._run(this.getCleanCommand());
};

CMake.prototype.reconfigure = async function () {
    this.extraCMakeArgs = [];
    await this.clean();
    await this.configure();
};

CMake.prototype.rebuild = async function () {
    this.extraCMakeArgs = [];
    await this.clean();
    await this.build();
};

CMake.prototype.compile = async function () {
    this.extraCMakeArgs = [];
    try {
        await this.build();
    }
    catch (e) {
        this.log.info("REP", "Build has been failed, trying to do a full rebuild.");
        await this.rebuild();
    }
};

CMake.prototype._run = function (command) {
    this.log.info("RUN", command);
    return processHelpers.run(command, {silent: this.silent});
};

module.exports = CMake;
