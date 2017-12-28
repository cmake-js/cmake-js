"use strict";
var $__9 = $traceurRuntime.initGeneratorFunction(generateRuntimeOptions),
    $__10 = $traceurRuntime.initGeneratorFunction(generateOptions);
var lib = require("../../");
var environment = lib.environment;
var Bluebird = require("bluebird");
var async = Bluebird.coroutine;
var _ = require("lodash");
var log = require("npmlog");
var util = require("util");
function generateRuntimeOptions() {
  function generateForNode(arch) {
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            $ctx.state = 2;
            return {
              runtime: "node",
              runtimeVersion: "0.10.36",
              arch: arch
            };
          case 2:
            $ctx.maybeThrow();
            $ctx.state = 4;
            break;
          case 4:
            $ctx.state = 6;
            return {
              runtime: "node",
              runtimeVersion: "4.4.2",
              arch: arch
            };
          case 6:
            $ctx.maybeThrow();
            $ctx.state = 8;
            break;
          case 8:
            $ctx.state = (environment.runtimeVersion !== "5.10.0") ? 9 : -2;
            break;
          case 9:
            $ctx.state = 10;
            return {
              runtime: "node",
              runtimeVersion: "5.10.0",
              arch: arch
            };
          case 10:
            $ctx.maybeThrow();
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__10, this);
  }
  function generateForNWJS(arch) {
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            $ctx.state = 2;
            return {
              runtime: "nw",
              runtimeVersion: "0.13.2",
              arch: arch
            };
          case 2:
            $ctx.maybeThrow();
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__11, this);
  }
  function generateForElectron(arch) {
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            $ctx.state = 2;
            return {
              runtime: "electron",
              runtimeVersion: "0.37.3",
              arch: arch
            };
          case 2:
            $ctx.maybeThrow();
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__12, this);
  }
  function generateForArch(arch) {
    var $__14,
        $__15,
        $__16,
        $__17,
        $__18,
        $__19;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            $__14 = $ctx.wrapYieldStar(generateForNode(arch)[Symbol.iterator]());
            $ctx.sent = void 0;
            $ctx.action = 'next';
            $ctx.state = 12;
            break;
          case 12:
            $__15 = $__14[$ctx.action]($ctx.sentIgnoreThrow);
            $ctx.state = 9;
            break;
          case 9:
            $ctx.state = ($__15.done) ? 3 : 2;
            break;
          case 3:
            $ctx.sent = $__15.value;
            $ctx.state = 10;
            break;
          case 2:
            $ctx.state = 12;
            return $__15.value;
          case 10:
            $__16 = $ctx.wrapYieldStar(generateForNWJS(arch)[Symbol.iterator]());
            $ctx.sent = void 0;
            $ctx.action = 'next';
            $ctx.state = 24;
            break;
          case 24:
            $__17 = $__16[$ctx.action]($ctx.sentIgnoreThrow);
            $ctx.state = 21;
            break;
          case 21:
            $ctx.state = ($__17.done) ? 15 : 14;
            break;
          case 15:
            $ctx.sent = $__17.value;
            $ctx.state = 22;
            break;
          case 14:
            $ctx.state = 24;
            return $__17.value;
          case 22:
            $__18 = $ctx.wrapYieldStar(generateForElectron(arch)[Symbol.iterator]());
            $ctx.sent = void 0;
            $ctx.action = 'next';
            $ctx.state = 36;
            break;
          case 36:
            $__19 = $__18[$ctx.action]($ctx.sentIgnoreThrow);
            $ctx.state = 33;
            break;
          case 33:
            $ctx.state = ($__19.done) ? 27 : 26;
            break;
          case 27:
            $ctx.sent = $__19.value;
            $ctx.state = -2;
            break;
          case 26:
            $ctx.state = 36;
            return $__19.value;
          default:
            return $ctx.end();
        }
    }, $__13, this);
  }
  var $__10,
      $__11,
      $__12,
      $__13,
      $__20,
      $__21,
      $__22,
      $__23,
      $__24,
      $__25;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $__10 = $traceurRuntime.initGeneratorFunction(generateForNode), $__11 = $traceurRuntime.initGeneratorFunction(generateForNWJS), $__12 = $traceurRuntime.initGeneratorFunction(generateForElectron), $__13 = $traceurRuntime.initGeneratorFunction(generateForArch);
          $ctx.state = 43;
          break;
        case 43:
          $ctx.state = (environment.isWin) ? 11 : 35;
          break;
        case 11:
          $__20 = $ctx.wrapYieldStar(generateForArch("x64")[Symbol.iterator]());
          $ctx.sent = void 0;
          $ctx.action = 'next';
          $ctx.state = 12;
          break;
        case 12:
          $__21 = $__20[$ctx.action]($ctx.sentIgnoreThrow);
          $ctx.state = 9;
          break;
        case 9:
          $ctx.state = ($__21.done) ? 3 : 2;
          break;
        case 3:
          $ctx.sent = $__21.value;
          $ctx.state = 10;
          break;
        case 2:
          $ctx.state = 12;
          return $__21.value;
        case 10:
          $__22 = $ctx.wrapYieldStar(generateForArch("ia32")[Symbol.iterator]());
          $ctx.sent = void 0;
          $ctx.action = 'next';
          $ctx.state = 24;
          break;
        case 24:
          $__23 = $__22[$ctx.action]($ctx.sentIgnoreThrow);
          $ctx.state = 21;
          break;
        case 21:
          $ctx.state = ($__23.done) ? 15 : 14;
          break;
        case 15:
          $ctx.sent = $__23.value;
          $ctx.state = 22;
          break;
        case 14:
          $ctx.state = 24;
          return $__23.value;
        case 35:
          $__24 = $ctx.wrapYieldStar(generateForArch()[Symbol.iterator]());
          $ctx.sent = void 0;
          $ctx.action = 'next';
          $ctx.state = 36;
          break;
        case 36:
          $__25 = $__24[$ctx.action]($ctx.sentIgnoreThrow);
          $ctx.state = 33;
          break;
        case 33:
          $ctx.state = ($__25.done) ? 27 : 26;
          break;
        case 27:
          $ctx.sent = $__25.value;
          $ctx.state = 22;
          break;
        case 26:
          $ctx.state = 36;
          return $__25.value;
        case 22:
          $ctx.state = 39;
          return {};
        case 39:
          $ctx.maybeThrow();
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__9, this);
}
function generateOptions() {
  var $__4,
      $__5,
      $__6,
      $__2,
      $__1,
      runtimeOptions,
      $__7;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $__4 = true;
          $__5 = false;
          $__6 = undefined;
          $ctx.state = 45;
          break;
        case 45:
          $ctx.pushTry(31, 32);
          $ctx.state = 34;
          break;
        case 34:
          $__2 = void 0, $__1 = (generateRuntimeOptions())[Symbol.iterator]();
          $ctx.state = 30;
          break;
        case 30:
          $ctx.state = (!($__4 = ($__2 = $__1.next()).done)) ? 26 : 28;
          break;
        case 4:
          $__4 = true;
          $ctx.state = 30;
          break;
        case 26:
          runtimeOptions = $__2.value;
          $ctx.state = 27;
          break;
        case 27:
          $ctx.state = (environment.isWin) ? 1 : 5;
          break;
        case 1:
          $ctx.state = 2;
          return runtimeOptions;
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 5:
          $ctx.state = 6;
          return _.extend({}, runtimeOptions, {
            preferClang: true,
            referMake: true
          });
        case 6:
          $ctx.maybeThrow();
          $ctx.state = 8;
          break;
        case 8:
          $ctx.state = 10;
          return _.extend({}, runtimeOptions, {preferClang: true});
        case 10:
          $ctx.maybeThrow();
          $ctx.state = 12;
          break;
        case 12:
          $ctx.state = 14;
          return _.extend({}, runtimeOptions, {
            preferGnu: true,
            referMake: true
          });
        case 14:
          $ctx.maybeThrow();
          $ctx.state = 16;
          break;
        case 16:
          $ctx.state = 18;
          return _.extend({}, runtimeOptions, {preferGnu: true});
        case 18:
          $ctx.maybeThrow();
          $ctx.state = 20;
          break;
        case 20:
          $ctx.state = 22;
          return runtimeOptions;
        case 22:
          $ctx.maybeThrow();
          $ctx.state = 4;
          break;
        case 28:
          $ctx.popTry();
          $ctx.state = 32;
          $ctx.finallyFallThrough = -2;
          break;
        case 31:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          $__7 = $ctx.storedException;
          $ctx.state = 37;
          break;
        case 37:
          $__5 = true;
          $__6 = $__7;
          $ctx.state = 32;
          $ctx.finallyFallThrough = -2;
          break;
        case 32:
          $ctx.popTry();
          $ctx.state = 43;
          break;
        case 43:
          try {
            if (!$__4 && $__1.return != null) {
              $__1.return();
            }
          } finally {
            if ($__5) {
              throw $__6;
            }
          }
          $ctx.state = 41;
          break;
        case 41:
          $ctx.state = $ctx.finallyFallThrough;
          break;
        default:
          return $ctx.end();
      }
  }, $__10, this);
}
var testRunner = {runCase: function(testCase, options) {
    var $__4 = true;
    var $__5 = false;
    var $__6 = undefined;
    try {
      var $__8 = function() {
        var testOptions = $__2.value;
        {
          var currentOptions = _.extend({}, testOptions, options || {});
          it("should build with: " + util.inspect(currentOptions), function(done) {
            async($traceurRuntime.initGeneratorFunction(function $__11() {
              return $traceurRuntime.createGeneratorInstance(function($ctx) {
                while (true)
                  switch ($ctx.state) {
                    case 0:
                      log.info("TEST", "Running case for options of: " + util.inspect(currentOptions));
                      $ctx.state = 6;
                      break;
                    case 6:
                      $ctx.state = 2;
                      return testCase(currentOptions);
                    case 2:
                      $ctx.maybeThrow();
                      $ctx.state = -2;
                      break;
                    default:
                      return $ctx.end();
                  }
              }, $__11, this);
            }))().nodeify(done);
          });
        }
      };
      for (var $__2 = void 0,
          $__1 = (generateOptions())[Symbol.iterator](); !($__4 = ($__2 = $__1.next()).done); $__4 = true) {
        $__8();
      }
    } catch ($__7) {
      $__5 = true;
      $__6 = $__7;
    } finally {
      try {
        if (!$__4 && $__1.return != null) {
          $__1.return();
        }
      } finally {
        if ($__5) {
          throw $__6;
        }
      }
    }
  }};
module.exports = testRunner;

//# sourceMappingURL=testRunner.js.map
