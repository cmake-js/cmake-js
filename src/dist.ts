import path from "path";
import urljoin from "url-join";
import fs from "fs-extra";

import { environment } from "./environment";
import { CMLog, CMLogOptions } from "./cmLog";
import { TargetOptions, TargetOptionsOptions } from "./targetOptions";
import runtimePaths from "./runtimePaths";
import { Downloader, Sum } from "./downloader";

function testSum(sums: Sum[], sum: string, fPath: string) {
  const serverSum = sums.find((s) => {
    return s.getPath === fPath;
  });
  if (serverSum && serverSum.sum === sum) {
    return;
  }
  throw new Error("SHA sum of file '" + fPath + "' mismatch!");
}

export interface DistOptions extends CMLogOptions, TargetOptionsOptions {
  runtimeDirectory?: string;
}

export class Dist {
  protected log: CMLog;
  protected targetOptions: TargetOptions;
  protected downloader: Downloader;

  constructor(protected options: DistOptions = {}) {
    this.log = new CMLog(this.options);
    this.targetOptions = new TargetOptions(this.options);
    this.downloader = new Downloader(this.options);
  }

  // Props
  get internalPath() {
    const cacheDirectory = ".cmake-js";
    const runtimeArchDirectory =
      this.targetOptions.runtime + "-" + this.targetOptions.arch;
    const runtimeVersionDirectory = "v" + this.targetOptions.runtimeVersion;

    return (
      this.options.runtimeDirectory ||
      path.join(
        environment.home,
        cacheDirectory,
        runtimeArchDirectory,
        runtimeVersionDirectory
      )
    );
  }

  get externalPath() {
    return runtimePaths.get(this.targetOptions).externalPath;
  }

  get downloaded() {
    let headers = false;
    let libs = true;
    let stat = this.getStat(this.internalPath);
    if (stat.isDirectory()) {
      if (this.headerOnly) {
        stat = this.getStat(
          path.join(this.internalPath, "include/node/node.h")
        );
        headers = stat.isFile();
      } else {
        stat = this.getStat(path.join(this.internalPath, "src/node.h"));
        if (stat.isFile()) {
          stat = this.getStat(
            path.join(this.internalPath, "deps/v8/include/v8.h")
          );
          headers = stat.isFile();
        }
      }
      if (environment.isWin) {
        for (const libPath of this.winLibs) {
          stat = this.getStat(libPath);
          libs = libs && stat.isFile();
        }
      }
    }
    return headers && libs;
  }

  get winLibs() {
    const libs = runtimePaths.get(this.targetOptions).winLibs;
    const result = [];
    for (const lib of libs) {
      result.push(path.join(this.internalPath, lib.dir, lib.name));
    }
    return result;
  }

  get headerOnly() {
    return runtimePaths.get(this.targetOptions).headerOnly;
  }

  // Methods
  async ensureDownloaded() {
    if (!this.downloaded) {
      await this.download();
    }
  }

  async download() {
    const log = this.log;
    log.info("DIST", "Downloading distribution files to: " + this.internalPath);
    await fs.ensureDir(this.internalPath);
    const sums = await this._downloadShaSums();
    await Promise.all([this._downloadLibs(sums), this._downloadTar(sums)]);
  }

  async _downloadTar(sums: Sum[]) {
    const log = this.log;
    const self = this;
    const tarLocalPath = runtimePaths.get(self.targetOptions).tarPath;
    const tarUrl = urljoin(self.externalPath, tarLocalPath);
    log.http("DIST", "\t- " + tarUrl);

    const sum = await this.downloader.downloadTgz(tarUrl, {
      hash: sums ? "sha256" : undefined,
      cwd: self.internalPath,
      strip: 1,
      filter(entryPath) {
        if (entryPath === self.internalPath) return true;
        const ext = path.extname(entryPath);
        return ext?.toLowerCase() === ".h";
      },
    });

    if (sums && sum) {
      testSum(sums, sum, tarLocalPath);
    }
  }

  getStat(path: string) {
    try {
      return fs.statSync(path);
    } catch (e) {
      return {
        isFile: () => false,
        isDirectory: () => false,
      };
    }
  }

  private async _downloadShaSums() {
    if (this.targetOptions.runtime === "node") {
      const sumUrl = urljoin(this.externalPath, "SHASUMS256.txt");
      const log = this.log;
      log.http("DIST", "\t- " + sumUrl);
      return (await this.downloader.downloadString(sumUrl))
        .split("\n")
        .map((line: string) => {
          const parts = line.split(/\s+/);
          return { getPath: parts[1], sum: parts[0] };
        })
        .filter((sum: Sum) => sum.getPath && sum.sum);
    } else {
      return null;
    }
  }

  private async _downloadLibs(sums: Sum[]) {
    const log = this.log;
    const self = this;
    if (!environment.isWin) {
      return;
    }

    const paths = runtimePaths.get(self.targetOptions);
    for (const dirs of paths.winLibs) {
      const subDir = dirs.dir;
      const fn = dirs.name;
      const fPath = subDir ? urljoin(subDir, fn) : fn;
      const libUrl = urljoin(self.externalPath, fPath);
      log.http("DIST", "\t- " + libUrl);

      await fs.ensureDir(path.join(self.internalPath, subDir));

      const sum = await this.downloader.downloadFile(libUrl, {
        path: path.join(self.internalPath, fPath),
        hash: sums ? "sha256" : undefined,
      });

      if (sums && sum) {
        testSum(sums, sum, fPath);
      }
    }
  }
}
