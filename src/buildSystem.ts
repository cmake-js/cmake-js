import isPlainObject from "lodash.isplainobject";

import { CMake, CMakeOptions } from "./cMake";
import { appCMakeJSConfig } from "./appCMakeJSConfig";
import { npmConfig } from "./npmConfig";
import { CMLog } from "./cmLog";

interface BuildSystemCmakeOptions extends CMakeOptions {
  buildSystem?: "cmake";
}

type BuildSystemOptions = BuildSystemCmakeOptions;

export class BuildSystem {
  private readonly bs: CMake;
  private readonly log: CMLog;

  private readonly runtimeDirectory?: string;
  private readonly msvsVersion?: string;
  private readonly runtime?: string;
  private readonly runtimeVersion?: string;
  private readonly arch?: string;

  constructor(private options: BuildSystemOptions = {}) {
    const BuildSystemClass = this._getBuildSystemClass(options.buildSystem);
    this.bs = new BuildSystemClass(options);
    this.log = new CMLog(options);

    const appConfig = appCMakeJSConfig(this.bs.projectRoot, this.log);
    const npmOptions = npmConfig(this.log);

    if (isPlainObject(npmOptions) && Object.keys(npmOptions).length) {
      this.runtimeDirectory = npmOptions["nodedir"];
      this.msvsVersion = npmOptions["msvs_version"];
    }

    if (
      isPlainObject(appConfig) &&
      appConfig &&
      Object.keys(appConfig).length
    ) {
      this.log.verbose(
        "CFG",
        "Applying CMake.js config from root package.json:"
      );
      this.log.verbose("CFG", JSON.stringify(appConfig));
      // Applying application's config, if there is no explicit runtime related options specified
      this.runtime = options.runtime || appConfig.runtime;
      this.runtimeVersion = options.runtimeVersion || appConfig.runtimeVersion;
      this.arch = options.arch || appConfig.arch;
    }

    this.log.verbose("CFG", "Build system options:");
    this.log.verbose("CFG", JSON.stringify(this.options));
  }

  async installRequirements() {
    try {
      await this.bs.toolset.initialize(true);
      if (!this.bs.isNodeApi) {
        await this.bs.dist.ensureDownloaded();
      }
    } catch (e) {
      if (e instanceof Error) {
        this._showError(e);
      }
      throw e;
    }
  }

  configure() {
    try {
      return this.bs.configure();
    } catch (e) {
      if (e instanceof Error) {
        this._showError(e);
      }
      throw e;
    }
  }

  reconfigure() {
    try {
      return this.bs.reconfigure();
    } catch (e) {
      if (e instanceof Error) {
        this._showError(e);
      }
      throw e;
    }
  }

  build() {
    try {
      return this.bs.build();
    } catch (e) {
      if (e instanceof Error) {
        this._showError(e);
      }
      throw e;
    }
  }

  rebuild() {
    try {
      return this.bs.rebuild();
    } catch (e) {
      if (e instanceof Error) {
        this._showError(e);
      }
      throw e;
    }
  }

  install() {
    try {
      return this.bs.install();
    } catch (e) {
      if (e instanceof Error) {
        this._showError(e);
      }
      throw e;
    }
  }

  private _showError(e: Error) {
    if (this.log === undefined) {
      // handle internal errors (init failed)
      console.error("OMG", e.stack);
      return;
    }
    if (this.log.level === "verbose" || this.log.level === "silly") {
      this.log.error("OMG", e.stack!);
    } else {
      this.log.error("OMG", e.message);
    }
  }

  private _getBuildSystemClass(
    buildSystem: BuildSystemCmakeOptions["buildSystem"]
  ) {
    switch (buildSystem) {
      case "cmake":
        return CMake;
      default:
        return CMake;
    }
  }
}
