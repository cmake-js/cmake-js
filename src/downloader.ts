import fs, { WriteStream } from "fs";
import { Transform } from "stream";
import crypto from "crypto";
import axios from "axios";
import zlib from "zlib";
import tar, { ExtractOptions } from "tar";
// @ts-ignore
import MemoryStream from "memory-stream";

import { CMLog, CMLogOptions } from "./cmLog";

export interface Sum {
  getPath: string;
  sum: string;
}

export interface DownloaderOptions extends CMLogOptions {}

export class Downloader {
  protected readonly log: CMLog;

  constructor(protected options: DownloaderOptions = {}) {
    this.log = new CMLog(this.options);
  }

  downloadToStream(
    url: string,
    stream: WriteStream | Transform,
    hash?: string
  ) {
    const self = this;
    const shasum = hash ? crypto.createHash(hash) : null;

    return new Promise<string | undefined>((resolve, reject) => {
      let length = 0;
      let done = 0;
      let lastPercent = 0;

      axios
        .get(url, { responseType: "stream" })
        .then((response) => {
          length = parseInt(response.headers["content-length"]);
          response.data.on("data", (chunk: Buffer) => {
            if (shasum) {
              shasum.update(chunk);
            }
            if (length) {
              done += chunk.length;
              let percent = (done / length) * 100;
              percent = Math.round(percent / 10) * 10 + 10;
              if (percent > lastPercent) {
                self.log.verbose("DWNL", "\t" + lastPercent + "%");
                lastPercent = percent;
              }
            }
          });

          response.data.pipe(stream);
        })
        .catch(function (err) {
          reject(err);
        });

      stream.once("error", reject);
      stream.once("finish", () => {
        resolve(shasum ? shasum.digest("hex") : undefined);
      });
    });
  }

  async downloadString(url: string) {
    const result = new MemoryStream();
    await this.downloadToStream(url, result);
    return result.toString();
  }

  async downloadFile(
    url: string,
    options: { path: string; hash?: string } | string
  ) {
    if (typeof options === "string") {
      options = { path: options };
    }
    const result = fs.createWriteStream(options.path);
    const sum = await this.downloadToStream(url, result, options.hash);
    this.testSum(url, sum, options);
    return sum;
  }

  async downloadTgz(
    url: string,
    options: ({ cwd: string; hash?: string } & ExtractOptions) | string
  ) {
    if (typeof options === "string") {
      options = { cwd: options };
    }
    const gunzip = zlib.createGunzip();
    const extractor = tar.extract(options);
    gunzip.pipe(extractor);
    const sum = await this.downloadToStream(url, gunzip, options.hash);
    this.testSum(url, sum, options);
    return sum;
  }

  testSum(
    url: string,
    sum: string | undefined,
    options: { hash?: string; sum?: string }
  ): void {
    if (options.hash && sum && options.sum && options.sum !== sum) {
      throw new Error(
        options.hash.toUpperCase() + " sum of download '" + url + "' mismatch!"
      );
    }
  }
}
