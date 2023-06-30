import assert from "assert";
import semver from "semver";
import isPlainObject from "lodash.isplainobject";

const NODE_MIRROR =
  process.env.NVM_NODEJS_ORG_MIRROR || "https://nodejs.org/dist";
const ELECTRON_MIRROR =
  process.env.ELECTRON_MIRROR ||
  "https://artifacts.electronjs.org/headers/dist";

export interface TargetOptions {
  runtime: string;
  runtimeVersion: string;
  isX64: boolean;
}

export interface RuntimePaths {
  externalPath: string;
  winLibs: { dir: string; name: string }[];
  tarPath: string;
  headerOnly: boolean;
}

const runtimePaths = {
  node(targetOptions: TargetOptions): RuntimePaths {
    if (semver.lt(targetOptions.runtimeVersion, "4.0.0")) {
      return {
        externalPath: `${NODE_MIRROR}/v${targetOptions.runtimeVersion}/`,
        winLibs: [
          {
            dir: targetOptions.isX64 ? "x64" : "",
            name: `${targetOptions.runtime}.lib`,
          },
        ],
        tarPath: `${targetOptions.runtime}-v${targetOptions.runtimeVersion}.tar.gz`,
        headerOnly: false,
      };
    } else {
      return {
        externalPath: `${NODE_MIRROR}/v${targetOptions.runtimeVersion}/`,
        winLibs: [
          {
            dir: targetOptions.isX64 ? "win-x64" : "win-x86",
            name: `${targetOptions.runtime}.lib`,
          },
        ],
        tarPath: `${targetOptions.runtime}-v${targetOptions.runtimeVersion}-headers.tar.gz`,
        headerOnly: true,
      };
    }
  },
  nw(targetOptions: TargetOptions): RuntimePaths {
    if (semver.gte(targetOptions.runtimeVersion, "0.13.0")) {
      return {
        externalPath: `https://node-webkit.s3.amazonaws.com/v${targetOptions.runtimeVersion}/`,
        winLibs: [
          {
            dir: targetOptions.isX64 ? "x64" : "",
            name: `${targetOptions.runtime}.lib`,
          },
          {
            dir: targetOptions.isX64 ? "x64" : "",
            name: "node.lib",
          },
        ],
        tarPath: `nw-headers-v${targetOptions.runtimeVersion}.tar.gz`,
        headerOnly: false,
      };
    }
    return {
      externalPath: `https://node-webkit.s3.amazonaws.com/v${targetOptions.runtimeVersion}/`,
      winLibs: [
        {
          dir: targetOptions.isX64 ? "x64" : "",
          name: `${targetOptions.runtime}.lib`,
        },
      ],
      tarPath: `nw-headers-v${targetOptions.runtimeVersion}.tar.gz`,
      headerOnly: false,
    };
  },
  electron(targetOptions: TargetOptions): RuntimePaths {
    return {
      externalPath: `${ELECTRON_MIRROR}/v${targetOptions.runtimeVersion}/`,
      winLibs: [
        {
          dir: targetOptions.isX64 ? "x64" : "",
          name: "node.lib",
        },
      ],
      tarPath: `node-v${targetOptions.runtimeVersion}.tar.gz`,
      headerOnly: semver.gte(targetOptions.runtimeVersion, "4.0.0-alpha"),
    };
  },
  get(targetOptions: TargetOptions) {
    assert(targetOptions && typeof targetOptions === "object");

    const runtime = targetOptions.runtime as keyof typeof runtimePaths;
    const func = runtimePaths[runtime];
    let paths: RuntimePaths;
    if (
      typeof func === "function" &&
      isPlainObject((paths = func(targetOptions)))
    ) {
      return paths;
    }
    throw new Error("Unknown runtime: " + runtime);
  },
};

export default runtimePaths;
