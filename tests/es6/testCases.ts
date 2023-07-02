import fs from "fs-extra";
import path from "path";
import assert from "assert";

import { BuildSystem, BuildSystemOptions } from "../../src";

export const testCases = {
  async buildPrototypeWithDirectoryOption(options: BuildSystemOptions) {
    options = {
      directory: path.resolve(path.join(__dirname, "./prototype")),
      ...options,
    };
    const buildSystem = new BuildSystem(options);
    await buildSystem.installRequirements();
    await buildSystem.rebuild();
    assert.ok(
      (
        await fs.stat(
          path.join(__dirname, "prototype/build/Release/addon.node")
        )
      ).isFile()
    );
  },
  async buildPrototype2WithCWD(options?: BuildSystemOptions) {
    const cwd = process.cwd();
    process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
    const buildSystem = new BuildSystem(options);
    try {
      await buildSystem.installRequirements();
      await buildSystem.rebuild();
      assert.ok(
        (
          await fs.stat(
            path.join(__dirname, "prototype2/build/Release/addon2.node")
          )
        ).isFile()
      );
    } finally {
      process.chdir(cwd);
    }
  },
  async buildPrototypeNapi(options?: BuildSystemOptions) {
    const cwd = process.cwd();
    process.chdir(path.resolve(path.join(__dirname, "./prototype-napi")));
    const buildSystem = new BuildSystem(options);
    try {
      await buildSystem.installRequirements();
      await buildSystem.rebuild();
      assert.ok(
        (
          await fs.stat(
            path.join(__dirname, "prototype-napi/build/Release/addon_napi.node")
          )
        ).isFile()
      );
    } finally {
      process.chdir(cwd);
    }
  },
  async shouldConfigurePreC11Properly(options?: BuildSystemOptions) {
    options = {
      directory: path.resolve(path.join(__dirname, "./prototype")),
      std: "c++98",
      ...options,
    };
    const buildSystem = new BuildSystem(options);
    if (!/visual studio/i.test(buildSystem.toolset.generator!)) {
      const command = await buildSystem.getConfigureCommand();
      assert.equal(command.indexOf("-std=c++"), -1, "c++ version still forced");
    }
  },
  async configureWithCustomOptions(options?: BuildSystemOptions) {
    options = {
      directory: path.resolve(path.join(__dirname, "./prototype")),
      cMakeOptions: {
        foo: "bar",
      },
      ...options,
    };
    const buildSystem = new BuildSystem(options);

    const command = await buildSystem.getConfigureCommand();
    assert.notEqual(command.indexOf("-Dfoo=bar"), -1, "custom options added");
  },
  async shouldForwardExtraCMakeArgs(options?: BuildSystemOptions) {
    options = {
      directory: path.resolve(path.join(__dirname, "./prototype")),
      ...options,
    };

    options.extraCMakeArgs = [
      "--debug-find-pkg=Boost",
      "--trace-source=FindBoost.cmake",
    ];
    const configure = await new BuildSystem(options).getConfigureCommand();
    assert.deepEqual(
      configure.slice(-2),
      options.extraCMakeArgs,
      "extra CMake args appended"
    );

    options.extraCMakeArgs = ["--", "CMakeFiles/x.dir/y.cpp.o"];
    const build = await new BuildSystem(options).getBuildCommand();
    assert.deepEqual(
      build.slice(-2),
      options.extraCMakeArgs,
      "extra CMake args appended"
    );

    options.extraCMakeArgs = [".cache", "/tmp/jest_rs"];
    const clean = await new BuildSystem(options).getCleanCommand();
    assert.deepEqual(
      clean.slice(-2),
      options.extraCMakeArgs,
      "extra CMake args appended"
    );
  },
};
