"use strict";
var assert = require("assert");
var lib = require("../../");
var BuildSystem = lib.BuildSystem;
var _ = require("lodash");
var path = require("path");
var Bluebird = require("bluebird");
var async = Bluebird.coroutine;
var fs = Bluebird.promisifyAll(require("fs-extra"));
var testCases = {
  buildPrototypeWithDirectoryOption: async($traceurRuntime.initGeneratorFunction(function $__2(options) {
    var buildSystem,
        $__3,
        $__4,
        $__5,
        $__6,
        $__7,
        $__8,
        $__9,
        $__10,
        $__11;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            options = _.extend({directory: path.resolve(path.join(__dirname, "./prototype"))}, options);
            buildSystem = new BuildSystem(options);
            $ctx.state = 14;
            break;
          case 14:
            $ctx.state = 2;
            return buildSystem.rebuild();
          case 2:
            $ctx.maybeThrow();
            $ctx.state = 4;
            break;
          case 4:
            $__3 = assert.ok;
            $__4 = fs.statAsync;
            $__5 = path.join;
            $__6 = $__5.call(path, __dirname, "prototype/build/Release/addon.node");
            $__7 = $__4.call(fs, $__6);
            $ctx.state = 10;
            break;
          case 10:
            $ctx.state = 6;
            return $__7;
          case 6:
            $__8 = $ctx.sent;
            $ctx.state = 8;
            break;
          case 8:
            $__9 = $__8.isFile;
            $__10 = $__9.call($__8);
            $__11 = $__3.call(assert, $__10);
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__2, this);
  })),
  buildPrototype2WithCWD: async($traceurRuntime.initGeneratorFunction(function $__12(options) {
    var cwd,
        buildSystem,
        $__13,
        $__14,
        $__15,
        $__16,
        $__17,
        $__18,
        $__19,
        $__20,
        $__21;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            cwd = process.cwd();
            process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
            buildSystem = new BuildSystem(options);
            $ctx.state = 22;
            break;
          case 22:
            $ctx.pushTry(null, 14);
            $ctx.state = 16;
            break;
          case 16:
            $ctx.state = 2;
            return buildSystem.rebuild();
          case 2:
            $ctx.maybeThrow();
            $ctx.state = 4;
            break;
          case 4:
            $__13 = assert.ok;
            $__14 = fs.statAsync;
            $__15 = path.join;
            $__16 = $__15.call(path, __dirname, "prototype2/build/Release/addon2.node");
            $__17 = $__14.call(fs, $__16);
            $ctx.state = 10;
            break;
          case 10:
            $ctx.state = 6;
            return $__17;
          case 6:
            $__18 = $ctx.sent;
            $ctx.state = 8;
            break;
          case 8:
            $__19 = $__18.isFile;
            $__20 = $__19.call($__18);
            $__21 = $__13.call(assert, $__20);
            $ctx.state = 14;
            $ctx.finallyFallThrough = -2;
            break;
          case 14:
            $ctx.popTry();
            $ctx.state = 20;
            break;
          case 20:
            process.chdir(cwd);
            $ctx.state = 18;
            break;
          case 18:
            $ctx.state = $ctx.finallyFallThrough;
            break;
          default:
            return $ctx.end();
        }
    }, $__12, this);
  })),
  shouldConfigurePreC11Properly: async($traceurRuntime.initGeneratorFunction(function $__22(options) {
    var buildSystem,
        command;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            options = _.extend({
              directory: path.resolve(path.join(__dirname, "./prototype")),
              std: "c++98"
            }, options);
            buildSystem = new BuildSystem(options);
            $ctx.state = 9;
            break;
          case 9:
            $ctx.state = (!/visual studio/i.test(buildSystem.toolset.generator)) ? 1 : -2;
            break;
          case 1:
            $ctx.state = 2;
            return buildSystem.getConfigureCommand();
          case 2:
            command = $ctx.sent;
            $ctx.state = 4;
            break;
          case 4:
            assert.equal(command.indexOf("-std=c++11"), -1, "c++11 still forced");
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__22, this);
  })),
  configureWithCustomOptions: async($traceurRuntime.initGeneratorFunction(function $__23(options) {
    var buildSystem,
        command;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            options = _.extend({
              directory: path.resolve(path.join(__dirname, "./prototype")),
              cMakeOptions: {foo: "bar"}
            }, options);
            buildSystem = new BuildSystem(options);
            $ctx.state = 6;
            break;
          case 6:
            $ctx.state = 2;
            return buildSystem.getConfigureCommand();
          case 2:
            command = $ctx.sent;
            $ctx.state = 4;
            break;
          case 4:
            assert.notEqual(command.indexOf("-DFOO=\"bar\""), -1, "custom options added");
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__23, this);
  }))
};
module.exports = testCases;

//# sourceMappingURL=testCases.js.map
