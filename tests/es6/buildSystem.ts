import assert from "assert";
import path from "path";
import log from "npmlog";

import { locateNAN } from "../../src/locateNAN";
import { CMake } from "../../src";

import { testRunner } from "./testRunner";
import { testCases } from "./testCases";

describe("BuildSystem", function () {
  this.timeout(300000);

  before(function () {
    if (process.env.UT_LOG_LEVEL) {
      log.level = process.env.UT_LOG_LEVEL;
      log.resume();
    }
    locateNAN.__projectRoot = path.resolve(path.join(__dirname, "../../"));
  });

  after(function () {
    locateNAN.__projectRoot = undefined;
  });

  describe("Build with various options", function () {
    testRunner.runCase(testCases.buildPrototypeWithDirectoryOption);
  });

  it("should provide list of generators", async () => {
    const gens = await CMake.getGenerators();
    assert(Array.isArray(gens));
    assert(gens.length > 0);
    assert.equal(
      gens.filter(function (g) {
        return g.length;
      }).length,
      gens.length
    );
  });

  it("should rebuild prototype if cwd is the source directory", async () => {
    await testCases.buildPrototype2WithCWD();
  });

  it("should build prototpye with nodeapi", async () => {
    await testCases.buildPrototypeNapi();
  });

  it("should run with old GNU compilers", async () => {
    await testCases.shouldConfigurePreC11Properly();
  });

  it("should configure with custom option", async () => {
    await testCases.configureWithCustomOptions();
  });

  it("should forward extra arguments to CMake", async () => {
    await testCases.shouldForwardExtraCMakeArgs();
  });
});
