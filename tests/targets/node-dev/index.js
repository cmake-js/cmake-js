// This small codeblock in your root-level index.js allows others to consume
// your addon as any other NodeJS module
const platform = process.platform;
var buildDir = "/build/lib/";

if(platform === "win32")
  buildDir = "\\build\\bin\\Release\\";

const hello = require(`.${buildDir}addon.node`);
module.exports = hello;
