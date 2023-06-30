import { CMLog } from "./cmLog";

function getNpmConfig(): Record<string, string> {
  const npmOptions: Record<string, string> = {};
  const npmConfigPrefix = "npm_config_";
  Object.keys(process.env).forEach((name) => {
    if (name.indexOf(npmConfigPrefix) !== 0) {
      return;
    }
    const value = process.env[name];
    name = name.substring(npmConfigPrefix.length);
    if (name && value) {
      npmOptions[name] = value;
    }
  });

  return npmOptions;
}

export const npmConfig = (log: CMLog) => {
  log.verbose("CFG", "Looking for NPM config.");
  const options = getNpmConfig();

  if (options) {
    log.silly("CFG", `NPM options: ${JSON.stringify(options, null, 2)}`);
  } else {
    log.verbose("CFG", "There are no NPM options available.");
  }

  return options;
};
