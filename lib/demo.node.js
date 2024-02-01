const platform = process.platform;
var buildDir = "/build/lib/";

if(platform === "win32")
  buildDir = "\\build\\bin\\Release\\";

const demo = require(`..${buildDir}demo.node`);
module.exports = demo;
