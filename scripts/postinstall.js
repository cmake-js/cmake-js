const { writeFileSync } = require("fs");

console.log(process.cwd());
writeFileSync("./cwd", process.cwd());
