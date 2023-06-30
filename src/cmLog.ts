import * as log from "npmlog";

export interface CMLogOptions {
  logName?: string;
  noLog?: boolean;
}

export class CMLog {
  options: CMLogOptions;
  debug: (message: string) => void;

  constructor(options: CMLogOptions) {
    this.options = options || {};
    this.debug = require("debug")(this.options.logName || "cmake-js");
  }

  get level(): string {
    if (this.options.noLog) {
      return "silly";
    } else {
      return log.level;
    }
  }

  silly(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      log.silly(cat, msg);
    }
  }

  verbose(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      log.verbose(cat, msg);
    }
  }

  info(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      log.info(cat, msg);
    }
  }

  warn(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      log.warn(cat, msg);
    }
  }

  http(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      log.http(cat, msg);
    }
  }

  error(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      log.error(cat, msg);
    }
  }
}
