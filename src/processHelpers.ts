import { spawn, execFile } from "child_process";

interface ProcessHelperRunOptions {
  silent?: boolean;
}

export const processHelpers = {
  run(command: string[], options: ProcessHelperRunOptions = {}) {
    return new Promise<void>(function (resolve, reject) {
      const env = { ...process.env };
      if (env.Path && env.PATH && env.Path !== env.PATH) {
        env.PATH = env.Path + ";" + env.PATH;
        delete env.Path;
      }
      const child = spawn(command[0], command.slice(1), {
        stdio: options.silent ? "ignore" : "inherit",
        env,
      });
      let ended = false;
      child.on("error", function (e) {
        if (!ended) {
          reject(e);
          ended = true;
        }
      });
      child.on("exit", function (code, signal) {
        if (!ended) {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error("Process terminated: " + (code || signal)));
          }
          ended = true;
        }
      });
    });
  },
  execFile(command: string[]) {
    return new Promise<string>(function (resolve, reject) {
      execFile(command[0], command.slice(1), function (err, stdout, stderr) {
        if (err) {
          reject(new Error(err.message + "\n" + (stdout || stderr)));
        } else {
          resolve(stdout);
        }
      });
    });
  },
};
