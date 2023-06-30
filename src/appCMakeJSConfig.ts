import path from "path";
import isPlainObject from "lodash.isplainobject";
import { CMLog } from "./cmLog";
import fs from "fs";

interface Config {
  [key: string]: any;
}

const getConfig = (lookPath: string, log: CMLog) => {
  const pjsonPath = path.join(lookPath, "package.json");

  log.silly("CFG", `Looking for package.json in: '${pjsonPath}'.`);
  try {
    const json = JSON.parse(fs.readFileSync(pjsonPath, "utf8"));
    log.silly("CFG", `Loaded:\n${JSON.stringify(json)}`);
    if (isPlainObject(json) && isPlainObject(json["cmake-js"])) {
      log.silly("CFG", "Config found.");
      return json["cmake-js"] as Config;
    } else {
      log.silly("CFG", "Config not found.");
      return null;
    }
  } catch (e) {
    log.silly("CFG", "'package.json' not found.");
    return null;
  }
};

export const appCMakeJSConfig = (projectPath: string, log: CMLog) => {
  log.verbose(
    "CFG",
    `Looking for application level CMake.js config in '${projectPath}'.`
  );
  let currPath = projectPath;
  let lastConfig: Config | null = null;
  let currConfig: Config | null;
  for (;;) {
    currConfig = getConfig(currPath, log);
    if (currConfig) {
      lastConfig = currConfig;
    }
    try {
      log.silly("CFG", "Looking for parent path.");
      const lastPath = currPath;
      currPath = path.normalize(path.join(currPath, ".."));
      if (lastPath === currPath) {
        return lastConfig;
      }
      if (currPath) {
        log.silly("CFG", `Parent path: '${currPath}'.`);
      }
    } catch (e) {
      if (e instanceof Error) {
        log.silly("CFG", `Exception:\n${e.stack}`);
      }
      break;
    }
    if (currPath === null) {
      log.silly(
        "CFG",
        "Parent path with package.json file doesn't exists. Done."
      );
      break;
    }
  }
  if (lastConfig) {
    log.verbose(
      "CFG",
      `Application level CMake.js config found:\n${JSON.stringify(lastConfig)}`
    );
  } else {
    log.verbose("CFG", "Application level CMake.js config doesn't exist.");
  }
  return lastConfig;
};
