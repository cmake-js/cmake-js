"use strict";
var processHelpers = require("./processHelpers");
var Bluebird = require("bluebird");
var async = Bluebird.coroutine;
var _ = require("lodash");
var vsDetect = {
  isInstalled: async($traceurRuntime.initGeneratorFunction(function $__1(version) {
    var $__2,
        $__3,
        $__4,
        $__5,
        $__6,
        $__7,
        $__8,
        $__9,
        $__10,
        $__11,
        $__12;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            $__2 = this._isVSInstalled;
            $__3 = $__2.call(this, version);
            $ctx.state = 28;
            break;
          case 28:
            $ctx.state = 2;
            return $__3;
          case 2:
            $__4 = $ctx.sent;
            $ctx.state = 4;
            break;
          case 4:
            $ctx.state = ($__4) ? 13 : 9;
            break;
          case 13:
            $__8 = $__4;
            $ctx.state = 14;
            break;
          case 9:
            $__5 = this._isVSvNextInstalled;
            $__6 = $__5.call(this, version);
            $ctx.state = 10;
            break;
          case 10:
            $ctx.state = 6;
            return $__6;
          case 6:
            $__7 = $ctx.sent;
            $ctx.state = 8;
            break;
          case 8:
            $__8 = $__7;
            $ctx.state = 14;
            break;
          case 14:
            $ctx.state = ($__8) ? 24 : 20;
            break;
          case 24:
            $__12 = $__8;
            $ctx.state = 25;
            break;
          case 20:
            $__9 = this._isBuildToolsInstalled;
            $__10 = $__9.call(this, version);
            $ctx.state = 21;
            break;
          case 21:
            $ctx.state = 17;
            return $__10;
          case 17:
            $__11 = $ctx.sent;
            $ctx.state = 19;
            break;
          case 19:
            $__12 = $__11;
            $ctx.state = 25;
            break;
          case 25:
            $ctx.returnValue = $__12;
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__1, this);
  })),
  _isBuildToolsInstalled: async($traceurRuntime.initGeneratorFunction(function $__13(version) {
    var mainVer,
        key,
        testPhrase,
        command,
        stdout,
        e;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            mainVer = version.split(".")[0];
            if (Number(mainVer) >= 15) {
              key = "HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VS.windows_toolscore,v" + mainVer;
              testPhrase = "Version";
            } else {
              key = "HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VS.VisualCppBuildTools_x86_enu,v" + mainVer;
              testPhrase = "Visual C++";
            }
            command = "reg query \"" + key + "\"";
            $ctx.state = 19;
            break;
          case 19:
            $ctx.pushTry(7, null);
            $ctx.state = 10;
            break;
          case 10:
            $ctx.state = 2;
            return processHelpers.exec(command);
          case 2:
            stdout = $ctx.sent;
            $ctx.state = 4;
            break;
          case 4:
            $ctx.returnValue = stdout && stdout.indexOf(testPhrase) > 0;
            $ctx.state = -2;
            break;
          case 6:
            $ctx.popTry();
            $ctx.state = 12;
            break;
          case 7:
            $ctx.popTry();
            $ctx.maybeUncatchable();
            e = $ctx.storedException;
            $ctx.state = 13;
            break;
          case 13:
            _.noop(e);
            $ctx.state = 12;
            break;
          case 12:
            $ctx.returnValue = false;
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__13, this);
  })),
  _isVSInstalled: async($traceurRuntime.initGeneratorFunction(function $__14(version) {
    var command,
        stdout,
        lines,
        e;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            command = "reg query \"HKLM\\Software\\Microsoft\\VisualStudio\\" + version + "\"";
            $ctx.state = 23;
            break;
          case 23:
            $ctx.pushTry(11, null);
            $ctx.state = 14;
            break;
          case 14:
            $ctx.state = 2;
            return processHelpers.exec(command);
          case 2:
            stdout = $ctx.sent;
            $ctx.state = 4;
            break;
          case 4:
            $ctx.state = (stdout) ? 8 : 6;
            break;
          case 8:
            lines = stdout.split("\r\n").filter(function(line) {
              return line.length > 10;
            });
            $ctx.state = 9;
            break;
          case 9:
            $ctx.state = (lines.length >= 4) ? 5 : 6;
            break;
          case 5:
            $ctx.returnValue = true;
            $ctx.state = -2;
            break;
          case 6:
            $ctx.popTry();
            $ctx.state = 16;
            break;
          case 11:
            $ctx.popTry();
            $ctx.maybeUncatchable();
            e = $ctx.storedException;
            $ctx.state = 17;
            break;
          case 17:
            _.noop(e);
            $ctx.state = 16;
            break;
          case 16:
            $ctx.returnValue = false;
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__14, this);
  })),
  _isVSvNextInstalled: async($traceurRuntime.initGeneratorFunction(function $__15(version) {
    var mainVer,
        command,
        stdout,
        lines,
        e;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            mainVer = version.split(".")[0];
            command = "reg query \"HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VisualStudio.MinShell.Msi,v" + mainVer + "\"";
            $ctx.state = 23;
            break;
          case 23:
            $ctx.pushTry(11, null);
            $ctx.state = 14;
            break;
          case 14:
            $ctx.state = 2;
            return processHelpers.exec(command);
          case 2:
            stdout = $ctx.sent;
            $ctx.state = 4;
            break;
          case 4:
            $ctx.state = (stdout) ? 8 : 6;
            break;
          case 8:
            lines = stdout.split("\r\n").filter(function(line) {
              return line.length > 10;
            });
            $ctx.state = 9;
            break;
          case 9:
            $ctx.state = (lines.length >= 3) ? 5 : 6;
            break;
          case 5:
            $ctx.returnValue = true;
            $ctx.state = -2;
            break;
          case 6:
            $ctx.popTry();
            $ctx.state = 16;
            break;
          case 11:
            $ctx.popTry();
            $ctx.maybeUncatchable();
            e = $ctx.storedException;
            $ctx.state = 17;
            break;
          case 17:
            _.noop(e);
            $ctx.state = 16;
            break;
          case 16:
            $ctx.returnValue = false;
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__15, this);
  }))
};
module.exports = vsDetect;

//# sourceMappingURL=vsDetect.js.map
