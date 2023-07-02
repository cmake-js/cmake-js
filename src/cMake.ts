import which from "which";
import fs from "fs-extra";
import path from "path";
import npmConfigData from "rc";
// @ts-ignore
import headers from "node-api-headers";

import { environment } from "./environment";
import { Dist } from "./dist";
import { CMLog, CMLogOptions } from "./cmLog";
import { TargetOptions, TargetOptionsOptions } from "./targetOptions";
import { processHelpers } from "./processHelpers";
import { locateNAN } from "./locateNAN";
import { locateNodeApi } from "./locateNodeApi";
import { Toolset, ToolsetOptions } from "./toolset";

export interface CMakeOptions
  extends CMLogOptions,
    TargetOptionsOptions,
    ToolsetOptions {
  directory?: string;
  out?: string;
  config?: "Debug" | "Release";
  debug?: boolean;
  cmakePath?: string;
  cMakeOptions?: Record<string, string>;
  extraCMakeArgs?: string[];
  silent?: boolean;
  target?: string;
  parallel?: number;
  std?: string;
}

function isNodeApi(log: CMLog, projectRoot: string) {
  try {
    const projectPkgJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8")
    );
    // Make sure the property exists
    return !!projectPkgJson?.binary?.napi_versions;
  } catch (e) {
    log.silly("CFG", "'package.json' not found.");
    return false;
  }
}

export class CMake {
  readonly projectRoot: string;
  readonly workDir: string;
  readonly config: string;
  readonly buildDir: string;
  readonly cMakeOptions: any;
  readonly silent: boolean;
  readonly isNodeApi: boolean;

  extraCMakeArgs: string[];

  readonly log: CMLog;
  readonly dist: Dist;
  readonly targetOptions: TargetOptions;
  readonly toolset: Toolset;

  constructor(protected readonly options: CMakeOptions) {
    this.log = new CMLog(this.options);
    this.dist = new Dist(this.options);

    this.projectRoot = path.resolve(this.options.directory || process.cwd());
    this.workDir = path.resolve(
      options.out || path.join(this.projectRoot, "build")
    );
    this.isNodeApi = isNodeApi(this.log, this.projectRoot);

    this.config =
      this.options.config || (this.options.debug ? "Debug" : "Release");
    this.buildDir = path.join(this.workDir, this.config);
    this._isAvailable = null;
    this.targetOptions = new TargetOptions(this.options);
    this.toolset = new Toolset(this.options);
    this.cMakeOptions = this.options.cMakeOptions || {};
    this.extraCMakeArgs = this.options.extraCMakeArgs || [];
    this.silent = !!options.silent;
  }

  protected _isAvailable: boolean | null;

  get isAvailable() {
    if (this._isAvailable === null) {
      this._isAvailable = CMake.isAvailable(this.options);
    }
    return this._isAvailable;
  }

  get path() {
    return this.options.cmakePath || "cmake";
  }

  static isAvailable(options?: any): boolean {
    options = options || {};
    try {
      if (options.cmakePath) {
        const stat = fs.lstatSync(options.cmakePath);
        return !stat.isDirectory();
      } else {
        which.sync("cmake");
        return true;
      }
    } catch (e) {
      // Ignore
    }
    return false;
  }

  static async getGenerators(options: CMakeOptions = {}, log?: any) {
    const arch = " [arch]";
    const gens: string[] = [];

    if (CMake.isAvailable(options)) {
      // try parsing machine-readable capabilities (available since CMake 3.7)
      try {
        const stdout = await processHelpers.execFile([
          options.cmakePath || "cmake",
          "-E",
          "capabilities",
        ]);
        const capabilities = JSON.parse(stdout);
        return capabilities.generators.map((x: any) => x.name);
      } catch (error) {
        if (log) {
          log.verbose(
            "TOOL",
            "Failed to query CMake capabilities (CMake is probably older than 3.7)"
          );
        }
      }

      // fall back to parsing help text
      const stdout: string = await processHelpers.execFile([
        options.cmakePath || "cmake",
        "--help",
      ]);
      const hasCr = stdout.includes("\r\n");
      const output = hasCr ? stdout.split("\r\n") : stdout.split("\n");
      let on = false;
      output.forEach((line, i) => {
        if (on) {
          const parts = line.split("=");
          if (
            (parts.length === 2 && parts[0].trim()) ||
            (parts.length === 1 &&
              i !== output.length - 1 &&
              output[i + 1].trim()[0] === "=")
          ) {
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
    } else {
      throw new Error("CMake is not installed. Install CMake.");
    }
    return gens;
  }

  async getGenerators(): Promise<string[]> {
    return CMake.getGenerators(this.options, this.log);
  }

  verifyIfAvailable() {
    if (!this.isAvailable) {
      throw new Error(
        "CMake executable is not found. Please use your system's package manager to install it, or you can get installers from there: http://cmake.org."
      );
    }
  }

  async getConfigureCommand() {
    // Create command:
    let command = [this.path, this.projectRoot, "--no-warn-unused-cli"];

    const D = [];

    // CMake.js watermark
    D.push({ CMAKE_JS_VERSION: environment.cmakeJsVersion });

    // Build configuration:
    D.push({ CMAKE_BUILD_TYPE: this.config });
    if (environment.isWin) {
      D.push({ CMAKE_RUNTIME_OUTPUT_DIRECTORY: this.workDir });
    } else if (this.workDir.endsWith(this.config)) {
      D.push({ CMAKE_LIBRARY_OUTPUT_DIRECTORY: this.workDir });
    } else {
      D.push({ CMAKE_LIBRARY_OUTPUT_DIRECTORY: this.buildDir });
    }

    // In some configurations MD builds will crash upon attempting to free memory.
    // This tries to encourage MT builds which are larger but less likely to have this crash.
    D.push({
      CMAKE_MSVC_RUNTIME_LIBRARY: "MultiThreaded$<$<CONFIG:Debug>:Debug>",
    });

    // Includes:
    const includesString = await this.getCmakeJsIncludeString();
    D.push({ CMAKE_JS_INC: includesString });

    // Sources:
    const srcsString = this.getCmakeJsSrcString();
    D.push({ CMAKE_JS_SRC: srcsString });

    // Runtime:
    D.push({ NODE_RUNTIME: this.targetOptions.runtime });
    D.push({ NODE_RUNTIMEVERSION: this.targetOptions.runtimeVersion });
    D.push({ NODE_ARCH: this.targetOptions.arch });

    if (environment.isOSX) {
      if (this.targetOptions.arch) {
        let xcodeArch = this.targetOptions.arch;
        if (xcodeArch === "x64") xcodeArch = "x86_64";
        D.push({ CMAKE_OSX_ARCHITECTURES: xcodeArch });
      }
    }

    // Custom options
    for (const [key, value] of Object.entries(this.cMakeOptions)) {
      D.push({ [key]: value });
    }

    // Toolset:
    await this.toolset.initialize(false);

    const libsString = this.getCmakeJsLibString();
    D.push({ CMAKE_JS_LIB: libsString });

    if (environment.isWin) {
      const nodeLibDefPath = this.getNodeLibDefPath();
      if (nodeLibDefPath) {
        const nodeLibPath = path.join(this.workDir, "node.lib");
        D.push({ CMAKE_JS_NODELIB_DEF: nodeLibDefPath });
        D.push({ CMAKE_JS_NODELIB_TARGET: nodeLibPath });
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
      D.push({ CMAKE_CXX_COMPILER: this.toolset.cppCompilerPath });
    }
    if (this.toolset.cCompilerPath) {
      D.push({ CMAKE_C_COMPILER: this.toolset.cCompilerPath });
    }
    if (this.toolset.compilerFlags.length) {
      D.push({ CMAKE_CXX_FLAGS: this.toolset.compilerFlags.join(" ") });
    }
    if (this.toolset.linkerFlags.length) {
      D.push({ CMAKE_SHARED_LINKER_FLAGS: this.toolset.linkerFlags.join(" ") });
    }
    if (this.toolset.makePath) {
      D.push({ CMAKE_MAKE_PROGRAM: this.toolset.makePath });
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

    command = command.concat(
      D.map(function (p) {
        return "-D" + Object.keys(p)[0] + "=" + Object.values(p)[0];
      })
    );

    return command.concat(this.extraCMakeArgs);
  }

  getCmakeJsLibString() {
    const libs = [];
    if (environment.isWin) {
      const nodeLibDefPath = this.getNodeLibDefPath();
      if (nodeLibDefPath) {
        libs.push(path.join(this.workDir, "node.lib"));
      } else {
        libs.push(...this.dist.winLibs);
      }
    }
    return libs.join(";");
  }

  async getCmakeJsIncludeString() {
    let incPaths = [];
    if (!this.isNodeApi) {
      // Include and lib:
      if (this.dist.headerOnly) {
        incPaths = [path.join(this.dist.internalPath, "/include/node")];
      } else {
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
      const apiHeaders = Object.create(headers);
      incPaths.push(apiHeaders.include_dir);

      // Node-api
      const napiH = await locateNodeApi(this.projectRoot);
      if (napiH) {
        incPaths.push(napiH);
      }
    }

    return incPaths.join(";");
  }

  getCmakeJsSrcString() {
    const srcPaths = [];
    if (environment.isWin) {
      const delayHook = path.normalize(
        path.join(__dirname, "cpp", "win_delay_load_hook.cc")
      );

      srcPaths.push(delayHook.replace(/\\/gm, "/"));
    }

    return srcPaths.join(";");
  }

  getNodeLibDefPath() {
    return environment.isWin && this.isNodeApi
      ? path.join(this.workDir, "node-lib.def")
      : undefined;
  }

  async configure() {
    this.verifyIfAvailable();

    this.log.info("CMD", "CONFIGURE");
    const listPath = path.join(this.projectRoot, "CMakeLists.txt");
    const command = await this.getConfigureCommand();

    try {
      await fs.lstat(listPath);
    } catch (e) {
      throw new Error("'" + listPath + "' not found.");
    }

    try {
      await fs.ensureDir(this.workDir);
    } catch (e) {
      // Ignore
    }

    const cwd = process.cwd();
    process.chdir(this.workDir);
    try {
      const nodeLibDefPath = this.getNodeLibDefPath();

      if (environment.isWin && nodeLibDefPath) {
        await this._generateNodeLibDef(nodeLibDefPath);
      }

      await this._run(command);
    } finally {
      process.chdir(cwd);
    }
  }

  async ensureConfigured() {
    try {
      await fs.lstat(path.join(this.workDir, "CMakeCache.txt"));
    } catch (e) {
      await this.configure();
    }
  }

  getBuildCommand() {
    const command = [
      this.path,
      "--build",
      this.workDir,
      "--config",
      this.config,
    ];
    if (this.options.target) {
      command.push("--target", this.options.target);
    }
    if (this.options.parallel) {
      command.push("--parallel", this.options.parallel.toString());
    }
    return Promise.resolve(command.concat(this.extraCMakeArgs));
  }

  async build() {
    this.verifyIfAvailable();

    await this.ensureConfigured();
    const buildCommand = await this.getBuildCommand();
    this.log.info("CMD", "BUILD");
    await this._run(buildCommand);
  }

  getInstallCommand() {
    const command = [
      this.path,
      "--install",
      this.workDir,
      "--config",
      this.config,
    ];
    if (this.options.target) {
      command.push("--target", this.options.target);
    }
    if (this.options.parallel) {
      command.push("--parallel", this.options.parallel.toString());
    }
    return Promise.resolve(command.concat(this.extraCMakeArgs));
  }

  async install() {
    this.verifyIfAvailable();

    await this.ensureConfigured();
    const installCommand = await this.getInstallCommand();
    this.log.info("CMD", "INSTALL");
    await this._run(installCommand);
  }

  getCleanCommand() {
    return [this.path, "-E", "remove_directory", this.workDir].concat(
      this.extraCMakeArgs
    );
  }

  clean() {
    this.verifyIfAvailable();

    this.log.info("CMD", "CLEAN");
    return this._run(this.getCleanCommand());
  }

  async reconfigure() {
    this.extraCMakeArgs = [];
    await this.clean();
    await this.configure();
  }

  async rebuild() {
    this.extraCMakeArgs = [];
    await this.clean();
    await this.build();
  }

  async compile() {
    this.extraCMakeArgs = [];
    try {
      await this.build();
    } catch (e) {
      this.log.info(
        "REP",
        "Build has been failed, trying to do a full rebuild."
      );
      await this.rebuild();
    }
  }

  private async _generateNodeLibDef(targetFile: string) {
    try {
      // Compile a Set of all the symbols that could be exported
      const allSymbols = new Set<string>();
      for (const ver of Object.values(headers.symbols) as any) {
        for (const sym of ver.node_api_symbols) {
          allSymbols.add(sym);
        }
        for (const sym of ver.js_native_api_symbols) {
          allSymbols.add(sym);
        }
      }

      // Write a 'def' file for NODE.EXE
      const allSymbolsArr = Array.from(allSymbols);
      await fs.writeFile(
        targetFile,
        "NAME NODE.EXE\nEXPORTS\n" + allSymbolsArr.join("\n")
      );

      return targetFile;
    } catch (e) {
      // It most likely wasn't found
      throw new Error(`Failed to generate def for node.lib`);
    }
  }

  private _run(command: string[]) {
    this.log.info("RUN", command.join(" "));
    return processHelpers.run(command, { silent: this.silent });
  }
}
