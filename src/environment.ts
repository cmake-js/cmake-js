import os from "os";
import which from "which";

import { version } from "../package.json";

interface PropertyDescriptorT<This, T> {
  value?: T;
  configurable?: boolean;
  enumerable?: boolean;
  writable?: boolean;
  get?(this: This): T;
  set?(this: This, v: T): void;
}

type PropertyDescriptorMapT<This, T> = {
  [s in keyof T]: PropertyDescriptorT<This, T[s]>;
};

declare global {
  interface ObjectConstructor {
    create<T, S>(o: T, properties?: PropertyDescriptorMapT<T & S, S>): T & S;
  }
}

export const environment = Object.create(
  {
    cmakeJsVersion: version,
    platform: os.platform(),
    isWin: os.platform() === "win32",
    isLinux: os.platform() === "linux",
    isOSX: os.platform() === "darwin",
    arch: os.arch(),
    isX86: os.arch() === "ia32" || os.arch() === "x86",
    isX64: os.arch() === "x64",
    isArm: os.arch() === "arm",
    runtime: "node",
    runtimeVersion: process.versions.node,
    home: process.env[
      os.platform() === "win32" ? "USERPROFILE" : "HOME"
    ] as string,
    EOL: os.EOL,
  },
  {
    isPosix: {
      get() {
        return !this.isWin;
      },
    },
    _isNinjaAvailable: { value: null as unknown as boolean, writable: true },
    isNinjaAvailable: {
      get() {
        if (this._isNinjaAvailable === null) {
          this._isNinjaAvailable = false;
          try {
            if (which.sync("ninja")) {
              this._isNinjaAvailable = true;
            }
          } catch {
            // Ignore
          }
        }

        return this._isNinjaAvailable;
      },
    },
    _isMakeAvailable: { value: null as unknown as boolean, writable: true },
    isMakeAvailable: {
      get() {
        if (this._isMakeAvailable === null) {
          this._isMakeAvailable = false;
          try {
            if (which.sync("make")) {
              this._isMakeAvailable = true;
            }
          } catch (e) {
            // Ignore
          }
        }

        return this._isMakeAvailable;
      },
    },
    _isGPPAvailable: { value: null as unknown as boolean, writable: true },
    isGPPAvailable: {
      get() {
        if (this._isGPPAvailable === null) {
          this._isGPPAvailable = false;
          try {
            if (which.sync("g++")) {
              this._isGPPAvailable = true;
            }
          } catch (e) {
            // Ignore
          }
        }
        return this._isGPPAvailable;
      },
    },
    _isClangAvailable: { value: null as unknown as boolean, writable: true },
    isClangAvailable: {
      get() {
        if (this._isClangAvailable === null) {
          this._isClangAvailable = false;
          try {
            if (which.sync("clang++")) {
              this._isClangAvailable = true;
            }
          } catch (e) {
            // Ignore
          }
        }
        return this._isClangAvailable;
      },
    },
  }
);
