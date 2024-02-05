const platform = process.platform;
var buildDir = "/build/lib/";

if(platform === "win32")
  buildDir = "\\build\\bin\\Release\\";

const addon = require(`..${buildDir}addon.node`);
module.exports = addon;
