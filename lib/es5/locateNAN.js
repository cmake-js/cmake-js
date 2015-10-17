"use strict";
var Bluebird = require("bluebird");
var fs = Bluebird.promisifyAll(require("fs-extra"));
var path = require("path");
var async = Bluebird.coroutine;
var _ = require("lodash");
var isNANModule = async($traceurRuntime.initGeneratorFunction(function $__0(dir) {
  var h,
      stat,
      e;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          h = path.join(dir, "nan.h");
          $ctx.state = 19;
          break;
        case 19:
          $ctx.pushTry(11, null);
          $ctx.state = 14;
          break;
        case 14:
          $ctx.state = 2;
          return fs.statAsync(h);
        case 2:
          stat = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.returnValue = stat.isFile();
          $ctx.state = -2;
          break;
        case 6:
          $ctx.popTry();
          $ctx.state = -2;
          break;
        case 11:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 9;
          break;
        case 9:
          _.noop(e);
          $ctx.state = 10;
          break;
        case 10:
          $ctx.returnValue = false;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__0, this);
}));
var isNodeJSProject = async($traceurRuntime.initGeneratorFunction(function $__1(dir) {
  var pjson,
      stat,
      e;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          pjson = path.join(dir, "package.json");
          $ctx.state = 19;
          break;
        case 19:
          $ctx.pushTry(11, null);
          $ctx.state = 14;
          break;
        case 14:
          $ctx.state = 2;
          return fs.statAsync(pjson);
        case 2:
          stat = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.returnValue = stat.isFile();
          $ctx.state = -2;
          break;
        case 6:
          $ctx.popTry();
          $ctx.state = -2;
          break;
        case 11:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 9;
          break;
        case 9:
          _.noop(e);
          $ctx.state = 10;
          break;
        case 10:
          $ctx.returnValue = false;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__1, this);
}));
var locateNAN = module.exports = async($traceurRuntime.initGeneratorFunction(function $__2(projectRoot) {
  var result,
      nanModulePath,
      $__3,
      $__4;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = 2;
          return isNodeJSProject(projectRoot);
        case 2:
          result = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = (!result) ? 5 : 6;
          break;
        case 5:
          $ctx.returnValue = null;
          $ctx.state = -2;
          break;
        case 6:
          nanModulePath = path.join(projectRoot, "node_modules", "nan");
          $ctx.state = 24;
          break;
        case 24:
          $ctx.state = 9;
          return isNANModule(nanModulePath);
        case 9:
          result = $ctx.sent;
          $ctx.state = 11;
          break;
        case 11:
          $ctx.state = (result) ? 12 : 13;
          break;
        case 12:
          $ctx.returnValue = nanModulePath;
          $ctx.state = -2;
          break;
        case 13:
          projectRoot = path.normalize(path.join(projectRoot, "..", ".."));
          $ctx.state = 26;
          break;
        case 26:
          $__3 = locateNAN(projectRoot);
          $ctx.state = 20;
          break;
        case 20:
          $ctx.state = 16;
          return $__3;
        case 16:
          $__4 = $ctx.sent;
          $ctx.state = 18;
          break;
        case 18:
          $ctx.returnValue = $__4;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__2, this);
}));

//# sourceMappingURL=locateNAN.js.map
