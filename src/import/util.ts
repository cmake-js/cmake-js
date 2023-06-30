import { execFile } from "child_process";
import path from "path";
import npmlog from "npmlog";

const setPrefixFn =
  (prefix: string, log: typeof npmlog) =>
  (logFunction: Function) =>
  (...args: any[]) =>
    logFunction.apply(log, [prefix, ...args]);

export const logWithPrefix = (log: typeof npmlog, prefix: string) => {
  const setPrefix = setPrefixFn(prefix, log);
  return {
    silly: setPrefix(log.silly),
    verbose: setPrefix(log.verbose),
    info: setPrefix(log.info),
    warn: setPrefix(log.warn),
    error: setPrefix(log.error),
  };
};

export const regGetValue = (
  key: string,
  value: string,
  addOpts: string[],
  cb: (err: Error | null, result?: string) => void
) => {
  const outReValue = value.replace(/\W/g, ".");
  const outRe = new RegExp(`^\\s+${outReValue}\\s+REG_\\w+\\s+(\\S.*)$`, "im");
  const reg = path.join(process.env.SystemRoot!, "System32", "reg.exe");
  const regArgs = ["query", key, "/v", value].concat(addOpts);

  npmlog.silly("reg", "running", reg, regArgs);
  const child = execFile(
    reg,
    regArgs,
    { encoding: "utf8" },
    (err: Error | null, stdout: string, stderr: string) => {
      npmlog.silly("reg", "reg.exe stdout = %j", stdout);
      if (err || stderr.trim() !== "") {
        npmlog.silly("reg", "reg.exe err = %j", err && (err.stack || err));
        npmlog.silly("reg", "reg.exe stderr = %j", stderr);
        return cb(err, stderr);
      }

      const result = outRe.exec(stdout);
      if (!result) {
        npmlog.silly("reg", "error parsing stdout");
        return cb(new Error("Could not parse output of reg.exe"));
      }
      npmlog.silly("reg", "found: %j", result[1]);
      cb(null, result[1]);
    }
  );
  child.stdin?.end();
};

export const regSearchKeys = (
  keys: string[],
  value: string,
  addOpts: string[],
  cb: (err: Error | null, result?: string) => void
) => {
  let i = 0;
  const search = () => {
    npmlog.silly("reg-search", "looking for %j in %j", value, keys[i]);
    regGetValue(keys[i], value, addOpts, (err, res) => {
      ++i;
      if (err && i < keys.length) {
        return search();
      }
      cb(err, res);
    });
  };
  search();
};
