import { environment } from "./environment";

export interface TargetOptionsOptions {
  arch?: string;
  runtime?: string;
  runtimeVersion?: string;
}

export class TargetOptions {
  constructor(protected options: TargetOptionsOptions = {}) {}

  get arch() {
    return this.options.arch || environment.arch;
  }

  get isX86() {
    return this.arch === "ia32" || this.arch === "x86";
  }

  get isX64() {
    return this.arch === "x64";
  }

  get isArm() {
    return this.arch === "arm";
  }

  get runtime() {
    return this.options.runtime || environment.runtime;
  }

  get runtimeVersion() {
    return this.options.runtimeVersion || environment.runtimeVersion;
  }
}
