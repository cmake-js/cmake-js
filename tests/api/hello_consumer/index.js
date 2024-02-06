// I am a third-party, or maybe fourth or fifth...
// I've never heard of 'cmake-js' before
// I just have NodeJS and CMake installed
// and everything "just works" for me!

const addon = require('@vendor/hello');

console.log(addon.hello())

// If I swap my package.json dependency for
// '@vendor/hello_with_types' and do
// 'require('@vendor/hello_with_types')' here instead,
// then my intellisense engine explains the
// functions to me :)
