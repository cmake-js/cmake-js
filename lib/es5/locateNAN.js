"use strict";
var Promise = require("bluebird");
var fs = require("fs-extra");
var path = require("path");
var async = Promise.coroutine;
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
          return fs.stat(h);
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
      node_modules,
      stat,
      $__2,
      $__3,
      $__4,
      e;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          pjson = path.join(dir, "package.json");
          node_modules = path.join(dir, "node_modules");
          $ctx.state = 31;
          break;
        case 31:
          $ctx.pushTry(19, null);
          $ctx.state = 22;
          break;
        case 22:
          $ctx.state = 2;
          return fs.stat(pjson);
        case 2:
          stat = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = (stat.isFile()) ? 5 : 6;
          break;
        case 5:
          $ctx.returnValue = true;
          $ctx.state = -2;
          break;
        case 6:
          $__2 = fs.stat;
          $__3 = $__2.call(fs, node_modules);
          $ctx.state = 13;
          break;
        case 13:
          $ctx.state = 9;
          return $__3;
        case 9:
          $__4 = $ctx.sent;
          $ctx.state = 11;
          break;
        case 11:
          stat = $__4;
          $ctx.state = 15;
          break;
        case 15:
          $ctx.state = (stat.isDirectory()) ? 16 : 17;
          break;
        case 16:
          $ctx.returnValue = true;
          $ctx.state = -2;
          break;
        case 17:
          $ctx.popTry();
          $ctx.state = 24;
          break;
        case 19:
          $ctx.popTry();
          $ctx.maybeUncatchable();
          e = $ctx.storedException;
          $ctx.state = 25;
          break;
        case 25:
          _.noop(e);
          $ctx.state = 24;
          break;
        case 24:
          $ctx.returnValue = false;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__1, this);
}));
var locateNAN = module.exports = async($traceurRuntime.initGeneratorFunction(function $__5(projectRoot) {
  var result,
      nanModulePath,
      $__6,
      $__7,
      $__8,
      $__9,
      $__10;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          if (locateNAN.__projectRoot) {
            projectRoot = locateNAN.__projectRoot;
          }
          $ctx.state = 28;
          break;
        case 28:
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
          $ctx.state = 30;
          break;
        case 30:
          $__6 = isNANModule(nanModulePath);
          $ctx.state = 13;
          break;
        case 13:
          $ctx.state = 9;
          return $__6;
        case 9:
          $__7 = $ctx.sent;
          $ctx.state = 11;
          break;
        case 11:
          result = $__7;
          $ctx.state = 15;
          break;
        case 15:
          $ctx.state = (result) ? 16 : 17;
          break;
        case 16:
          $ctx.returnValue = nanModulePath;
          $ctx.state = -2;
          break;
        case 17:
          $__8 = goUp(projectRoot);
          $__9 = locateNAN($__8);
          $ctx.state = 24;
          break;
        case 24:
          $ctx.state = 20;
          return $__9;
        case 20:
          $__10 = $ctx.sent;
          $ctx.state = 22;
          break;
        case 22:
          $ctx.returnValue = $__10;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__5, this);
}));
function goUp(dir) {
  var items = dir.split(path.sep);
  var scopeItem = items[items.length - 2];
  if (scopeItem && scopeItem[0] === "@") {
    dir = path.join(dir, "..");
  }
  dir = path.join(dir, "..", "..");
  return path.normalize(dir);
}

//# sourceMappingURL=locateNAN.js.map
