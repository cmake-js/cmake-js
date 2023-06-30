const { exec } = require("child_process");
const { writeFileSync } = require("fs");

exec("npm run build", (err, stdout, stderr) => {
  if (err) {
    throw err;
  }
  if (stderr) {
    throw stderr;
  }

  writeFileSync("build/.done", stdout);
});
