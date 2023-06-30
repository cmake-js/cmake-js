import npmlog from "npmlog";
import debug from "debug";

interface Logger {
  silly: (...messages: string[]) => void;
  verbose: (...messages: string[]) => void;
  info: (...messages: string[]) => void;
  http: (...messages: string[]) => void;
  warn: (...messages: string[]) => void;
  error: (...messages: string[]) => void;
}

export interface CMLogOptions {
  logger?: Logger;
  logName?: string;
  noLog?: boolean;
}

export class CMLog {
  debug: (message: string) => void;

  constructor(protected options: CMLogOptions = {}) {
    this.options.logger = this.options.logger || {
      silly: (...messages) =>
        npmlog.silly(messages[0], messages.slice(1).join(" ")),
      verbose: (...messages) =>
        npmlog.verbose(messages[0], messages.slice(1).join(" ")),
      info: (...messages) =>
        npmlog.info(messages[0], messages.slice(1).join(" ")),
      http: (...messages) =>
        npmlog.http(messages[0], messages.slice(1).join(" ")),
      warn: (...messages) =>
        npmlog.warn(messages[0], messages.slice(1).join(" ")),
      error: (...messages) =>
        npmlog.error(messages[0], messages.slice(1).join(" ")),
    };
    this.debug = debug(options.logName || "cmake-js");
  }

  get level(): string {
    if (this.options.noLog) {
      return "silly";
    } else {
      return npmlog.level;
    }
  }

  silly(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      this.options.logger!.silly(cat, msg);
    }
  }

  verbose(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      this.options.logger!.verbose(cat, msg);
    }
  }

  info(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      this.options.logger!.info(cat, msg);
    }
  }

  warn(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      this.options.logger!.warn(cat, msg);
    }
  }

  http(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      this.options.logger!.http(cat, msg);
    }
  }

  error(cat: string, msg: string): void {
    if (this.options.noLog) {
      this.debug(cat + ": " + msg);
    } else {
      this.options.logger!.error(cat, msg);
    }
  }
}
