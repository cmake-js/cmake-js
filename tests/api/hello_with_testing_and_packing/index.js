// This small codeblock in your root-level index.js allows others to consume
// your addon as any other NodeJS module
const hello_with_testing_and_packing = require(`./lib/addon.node`);
module.exports = hello_with_testing_and_packing;
