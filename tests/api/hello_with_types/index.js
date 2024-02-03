// This small codeblock in your root-level index.js allows others to consume
// your addon as any other NodeJS module
const hello = require(`./lib/addon.node`);
module.exports = hello;
