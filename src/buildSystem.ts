import isPlainObject from "lodash.isplainobject";

import { CMake, CMakeOptions } from "./cMake";
import { appCMakeJSConfig } from "./appCMakeJSConfig";
import { npmConfig } from "./npmConfig";

export interface BuildSystemOptions extends CMakeOptions {}

export class BuildSystem extends CMake {
  private readonly runtimeDirectory?: string;
  private readonly msvsVersion?: string;
  private readonly runtime?: string;
  private readonly runtimeVersion?: string;
  private readonly arch?: string;

  constructor(options: BuildSystemOptions = {}) {
    super(options);

    const appConfig = appCMakeJSConfig(this.projectRoot, this.log);
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

  install() {
    return this._ensureInstalled();
  }

  private async _ensureInstalled() {
    try {
      await this.toolset.initialize(true);
      if (!this.isNodeApi) {
        await this.dist.ensureDownloaded();
      }
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
}
