# CMake.js (MIT)

[![Node CI](https://github.com/cmake-js/cmake-js/actions/workflows/node.yaml/badge.svg)](https://github.com/cmake-js/cmake-js/actions/workflows/node.yaml)
[![npm](https://img.shields.io/npm/v/cmake-js)](https://www.npmjs.com/package/cmake-js)

## About

CMake.js is a Node.js native addon build tool intended to be an alternative to [node-gyp](https://github.com/nodejs/node-gyp), but instead of [gyp](http://en.wikipedia.org/wiki/GYP_%28software%29), it is based on widely used [CMake](http://cmake.org) build system. It's compatible with the following runtimes:

- Node.js 18.17+ since CMake.js v8.0.0 (for older runtimes please use an earlier version of CMake.js). Newer versions can produce builds targeting older runtimes
- [NW.js](https://github.com/nwjs/nw.js): all CMake.js based native modules are compatible with NW.js out-of-the-box, there is no [nw-gyp like magic](https://github.com/nwjs/nw.js/wiki/Using-Node-modules#3rd-party-modules-with-cc-addons) required
- [Electron](https://github.com/electron/electron): out-of-the-box build support, [no post build steps required](https://github.com/electron/electron/blob/main/docs/tutorial/using-native-node-modules.md) in most cases.

We strongly recommend using the newer `Node-API` for your module instead of `NAN`, as that means one build will be able to run on all the runtimes above without needing to be built separately for each.

CMake.js v8.0 has undergone a large rewrite to simplify its usage and become more friendly to those familiar with CMake. Check the migration guide below for help updating your existing project.

## Installation

```bash
npm install cmake-js
```

**Help:**

```bash
cmake-js --help
```

```
CMake.js 8.0.0-0

Usage: cmake-js [<command>] [options]

Commands:
  cmake-js.mjs autobuild  Invoke cmake with the given arguments to configure the
                           project, then perform an automatic build
                          You can add any custom cmake args after `--`
  cmake-js.mjs configure  Invoke cmake with the given arguments
                          You can add any custom cmake args after `--`
  cmake-js.mjs build      Invoke `cmake --build` with the given arguments
                          You can add any custom cmake args after `--`
  cmake-js.mjs clean      Clean the project directory

Options:
      --silent  Silence CMake output                  [boolean] [default: false]
  -B, --dest    Specify the directory to write build output to, default is build
                                                     [string] [default: "build"]
      --help    Show help                                              [boolean]
```

**Requirements:**

- [CMake](http://www.cmake.org/download/)
  - When using Visual C++ on Windows, they provide a suitable CMake binary that we will utilise.
- A proper C/C++ compiler toolchain of the given platform
  - **Windows**:
    - [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/). If you installed nodejs with the installer, you can install these when prompted.
    - An alternate way is to install the [Chocolatey package manager](https://chocolatey.org/install), and run `choco install visualstudio2019-workload-vctools` in an Administrator Powershell
  - **Unix/Posix**:
    - GCC or Clang
    - Ninja or Make

## Usage

### General

It is strong recommended to use Node-API for new projects instead of NAN. It provides ABI stability making usage simpler and reducing maintainance.

In a nutshell, look at the [test project](./tests-cmake/projects) we use for automated testing.

- Install cmake-js for your module `npm install --save cmake-js`
- Put a CMakeLists.txt file into your module root with this minimal required content:

```cmake
cmake_minimum_required(VERSION 3.15...3.31)
project(your-addon-name-here)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")
include(CMakeJS)

cmakejs_setup_node_api_c_library()

cmakejs_create_node_api_addon(addon
  NAPI_VERSION 8
  src/addon.cpp
)

```

- Add the following into your package.json scripts section:

```json
"scripts": {
    "install": "cmake-js autobuild"
  }
```

### Commandline

With cmake-js installed as a depdendency or devDependency of your module, you can access run commands directly with:

```
npx cmake-js --help
# OR
yarn cmake-js --help
```

Please refer to the `--help` for the lists of available commands (they are like commands in `cmake`).

You can override the project default runtimes via `--runtime` and `--runtime-version`, such as: `--runtime=electron --runtime-version=31.0.0`. See below for more info on runtimes.

The commandline is intended to be a minimal wrapper over `cmake`. It is intended to help find `cmake` and provide some default arguments.

#### For users new to CMake

If you don't have prior experience with `cmake`, the commandline is written to be fairly simple.  
If you get stuck, you can look for general cmake guidance online, as the syntax is almost identical.

`cmake-js autobuild` is the simplest command, it performs a configuration and build.  
You can add a `--source some-path` to specify the folder containing the `CMakeLists.txt`.  
You can add a `--dest some-path` to change from using the default `build` folder.  
If you need to add any cmake arguments, you can do so after a `--` token. These will be forwarded to the configure step unchanged.

If you need more granularity, you can split this into a `cmake-js configure` and `cmake-js build`.

#### For users familiar with CMake

If you already know how to use `cmake`, then the commandline should feel very familiar to you.

- `cmake-js configure` is equivalent to a `cmake` invocation. It can take a few arguments, and will populate the defaults of them, and will populate a few defines based on these arguments.

- `cmake-js build` is equivalent to `cmake --build`. It provides defaults for a few arguments, and not much else.

- `cmake-js clean` is equivalent to `cmake --build --target clean`.

- `cmake-js autobuild` is a configure and build. The build step of this is not configurable, this is a convenience script to make it an easy oneliner for new users.

For all of the commands, you can provide custom arguments after a `--`. eg: `cmake-js configure --source="cmake-js-path-argument" -- -DCUSTOM_DEFINE=1`

#### Node-API and `node-addon-api`

[ABI-stable Node.js API
(Node-API)](https://nodejs.org/api/n-api.html#n_api_node_api),
which was previously known as N-API, supplies a set of C
APIs that allow to compilation and loading of native modules by
different versions of Node.js that support Node-API which includes
all versions of Node.js v10.x and later.

To compile a native module that uses only the
[plain `C` Node-API calls](https://nodejs.org/api/n-api.html#n_api_node_api),
follow the directions for plain `node` native modules.

You must also add the following lines to your CMakeLists.txt, to make the correct headers available

```
cmakejs_setup_node_api_c_library()
```

If you have any `cmakejs_setup_node_dev_library()` or `cmakejs_setup_node_nan_library()` lines, they should be removed to disable the old api and streamline the build.

To compile a native module that uses the header-only C++ wrapper
classes provided by
[`node-addon-api`](https://github.com/nodejs/node-addon-api),
you need to make your package depend on it with:

    npm install --save node-addon-api

You must add the following to your CMakeLists.txt just below the `cmakejs_setup_node_api_c_library()` line, to configure the build to use it.

```
cmakejs_setup_node_api_cpp_library()
```

That is it, the necessary headers will be available to your module!

You can see some [example projects](./tests-cmake/projects)

#### NAN and v8 Api

It is advised to not use this API unless necessary as it makes building and distributing your project more complex. Use the new `Node-API` instead if possible.

To enable the v8 api, your CMakeLists.txt should contain `cmakejs_setup_node_dev_library()` before your addon is created.
Optionally, you may want to `cmakejs_setup_node_nan_library()` too if you wish to use the NAN library which provides a slightly more stable abstraction of this api.

You can see an [example](./tests-cmake/projects/nan)

#### Electron

On Windows, the [`win_delay_load_hook`](https://www.electronjs.org/docs/tutorial/using-native-node-modules#a-note-about-win_delay_load_hook) is required to be embedded in the module or it will fail to load in the render process.
cmake-js will automatically add it to your module

Without the hook, the module can only be called from the render process using the Electron [remote](https://github.com/electron/electron/blob/master/docs/api/remote.md) module.

#### Heroku

[Heroku](https://heroku.com) uses the concept of a [buildpack](https://devcenter.heroku.com/articles/buildpacks) to define
how an application should be prepared to run in a [dyno](https://devcenter.heroku.com/articles/dynos).
The typical buildpack for note-based applications,
[heroku/nodejs](https://github.com/heroku/heroku-buildpack-nodejs),
provides an environment capable of running [node-gyp](https://github.com/nodejs/node-gyp),
but not [CMake](http://cmake.org).

The least "painful" way of addressing this is to use heroku's multipack facility:

- Set the applications' buildpack to
  [https://github.com/heroku/heroku-buildpack-multi.git](https://github.com/heroku/heroku-buildpack-multi.git)

- In the root directory of the application,
  create a file called `.buildpacks` with these two lines:

          https://github.com/brave/heroku-cmake-buildpack.git
          https://github.com/heroku/heroku-buildpack-nodejs.git

- Deploy the application to have the changes take effect

The `heroku-buildpack-multi` will run each buildpack in order allowing the node application to reference CMake in the Heroku
build environment.

## Real examples

- [@julusian/jpeg-turbo](https://github.com/julusian/node-jpeg-turbo) - A Node-API wrapping around libjpeg-turbo. cmake-js was a good fit here, as libjpeg-turbo provides cmake files that can be used, and would be hard to replicate correctly in node-gyp
- [node-datachannel](https://github.com/murat-dogan/node-datachannel) - Easy to use WebRTC data channels and media transport
- [aws-iot-device-sdk-v2](https://github.com/aws/aws-iot-device-sdk-js-v2) AWS IoT Device SDK for JavaScript v2

Open a PR to add your own project here.

## Migration Guide

CMake.js v8 is a large overhaul of the library, and requires a few manual steps to update your project.

This will make your CMakeLists.txt simpler and will allow your IDE to load the project correctly without any weird tricks.

In most cases, it is easiest to simply start the CMakeLists.txt again based off one of our examples.  
Take a look at the [example projects](./tests-cmake/projects) for one that matches your project setup the closest. You can then skip to the end of the steps to update the scripts in your `package.json`

To do it more manually, you should:

1. Near the top of the file add:

```
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")
include(CMakeJS)
```

2. If you have a line which adds `-std=c++14` or similar to `CXXFLAGS`, or some other way of setting the cxx standard, you can likely remove this, as this is done automatically for you based on the target
3. `CMAKE_JS_INC` can be removed from the `include_directories` or `target_include_directories` function. This might result in the function call being unused and possible to be removed
4. `CMAKE_JS_LIB` can be removed from the `target_link_libraries` function. This might result in the function call being unused and possible to be removed
5. The `set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")` or similar line can be removed.
6. The block containing the line `execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})` can be removed.
7. The `add_library` line should be changed to `cmakejs_create_node_api_addon`, and the `SHARED` argument must be removed.
8. Below the `include(CMakeJS)` line, and before the `cmakejs_create_node_api_addon(` call, you will need to add some of the following, depending on which api libraries your project uses:

   - If using node-api: `cmakejs_setup_node_api_c_library()`
   - If using node-addon-api: `cmakejs_setup_node_api_cpp_library()`
   - If using the v8 api: `cmakejs_setup_node_dev_library()`
   - If using NAN: `cmakejs_setup_node_nan_library()`

9. Finally, update the `scripts` block in your package.json. Any command using `cmake-js` will need updating.
   You should read the [Commandline](#Commandline) section above first as a primer. For any commands:
   - `-l`, `--log-level`, `-D`, `--debug`, `-m`, `--prefer-make`, `-x`, `--prefer-xcode`, `-g`, `--prefer-gnu`, `-C`, `--prefer-clang` are no longer provided and should be removed
   - `-O` or `--out` parameter can be changed to `-B` or `--dest`
   - `-d` or `--directory` parameter can be changed to `-S` or `--source` and is only accepted in the `cmake-js configure` or `cmake-js autobuild` commands.
   - `-B` or `--config` should be added after the `--` as `--config` to the `cmake-js build` command. The default behaviour is to build `Release`
   - `-c` or `--cmake-path` can only be provided as an environment variable `CMAKEJS_CMAKE_PATH`
   - `-G` or `--generator` should be added after the `--` as `-G` to the `cmake-js configure` or `cmake-js autobuild` commands. These are often not needed as the autoselection logic is usually sufficient
   - `-t` or `--toolset` should be added after the `--` as `-T` to the `cmake-js configure` or `cmake-js autobuild` commands.
   - `-A` or `--platform` should be added after the `--` as `-A` to the `cmake-js configure` or `cmake-js autobuild` commands.
   - `-T` or `--target` should be added after the `--` as `-t` or `--target` to the `cmake-js build` command.
   - `-cc` should be ???
   - `-cxx` should be ???
   - `-r` or `--runtime` should be added before the `--` as `--runtime` to the `cmake-js configure` or `cmake-js autobuild` commands.
   - `-v` or `--runtime-version` should be added before the `--` as `--runtimeVersion` to the `cmake-js configure` or `cmake-js autobuild` commands.
   - `-a` or `--arch` should be added before the `--` as `--runtimeArch` to the `cmake-js configure` or `cmake-js autobuild` commands.
   - `-p` or `--parallel` should be added after the `--` as `--parallel` to the `cmake-js build` command. This is enabled by default now
   - `-CD` or anything starting with `-CD` should be added after the `--` as `-D` to the `cmake-js configure` or `cmake-js autobuild` commands.
   - `-i` or `--silent` should be added before the `--` as `--silent` to any command.

Have any questions or think something was missed here? Open an issue and we will be happy to help!

Do you use the `cmake-js` configuration block in your package.json? If so we want to hear from you to understand the use case. This didn't fit into the new design nicely, so we don't want to add it back unless it is solves a real problem.

## Changelog

View [changelog.md](changelog.md)

## Credits

https://github.com/cmake-js/cmake-js/graphs/contributors

Ty all!
