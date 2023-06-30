import { writeFileSync } from "fs";

console.log(process.cwd());
writeFileSync("./cwd", process.cwd());
