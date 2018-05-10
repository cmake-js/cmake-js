"use strict";
var Bluebird = require("bluebird");
var async = Bluebird.coroutine;
var locateNAN = require("../../").locateNAN;
var path = require("path");
var assert = require("assert");
describe("locateNAN", function() {
  var PROJECT_DIR = path.resolve(__dirname, "..", "fixtures", "project");
  var NAN_DIR = path.join(PROJECT_DIR, "node_modules", "nan");
  it("should locate NAN from dependency", function() {
    var dir = path.join(PROJECT_DIR, "node_modules", "dep-1");
    return async($traceurRuntime.initGeneratorFunction(function $__0() {
      var nan;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $ctx.state = 2;
              return locateNAN(dir);
            case 2:
              nan = $ctx.sent;
              $ctx.state = 4;
              break;
            case 4:
              assert.equal(nan, NAN_DIR);
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__0, this);
    }))();
  });
  it("should locate NAN from nested dependency", function() {
    var dir = path.join(PROJECT_DIR, "node_modules", "dep-1", "node_modules", "dep-3");
    return async($traceurRuntime.initGeneratorFunction(function $__0() {
      var nan;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $ctx.state = 2;
              return locateNAN(dir);
            case 2:
              nan = $ctx.sent;
              $ctx.state = 4;
              break;
            case 4:
              assert.equal(nan, NAN_DIR);
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__0, this);
    }))();
  });
  it("should locate NAN from scoped dependency", function() {
    var dir = path.join(PROJECT_DIR, "node_modules", "@scope", "dep-2");
    return async($traceurRuntime.initGeneratorFunction(function $__0() {
      var nan;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $ctx.state = 2;
              return locateNAN(dir);
            case 2:
              nan = $ctx.sent;
              $ctx.state = 4;
              break;
            case 4:
              assert.equal(nan, NAN_DIR);
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__0, this);
    }))();
  });
});

//# sourceMappingURL=locateNAN.js.map
