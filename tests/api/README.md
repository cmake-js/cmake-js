# CMakeJS.cmake API examples

The directories contained here demonstrate some of the various functionality that cmake-js provides.

Everything is powered by a tidy combination of cmake-js' Javascript CLI and it's CMake API.

```hello_consumer``` demonstrates how cmake-js - powered addons behave when they filter out into the wider world; the ```consumer``` in question should have NodeJS, CMake, and a C/C++ compiler toolchain installed, but they are not burdened with actually operating any of those tools in order to use somebody's addon like a regular NodeJS module.

The remaining ```hello_*``` projects each represent various functionalities that our CLI/API combo provides Addon buiders with - see their package.json commands and README files for a better understanding of each demonstration and their purposes.

An especially interesting example is ```hello_with_testing_and_packing```, which demonstrates not just the cmake-js CLI/API, but also leverages some of the deeper functionality we have provided our CMake targets with, such as providing Addon builders with fully transportable dependencies :)
