# CMake.js (MIT)

## Quick note to contributors

First of all, thanks for the PRs! Keep'em comming! I try to verify and release stuff as fast as I can. So, you should not bother to compile and include ES5 files along with ur PRs, generating them is the part of the release process.

## About
CMake.js is a Node.js/io.js native addon build tool which works *exactly* like [node-gyp](https://github.com/TooTallNate/node-gyp), but instead of [gyp](http://en.wikipedia.org/wiki/GYP_%28software%29), it is based on [CMake](http://cmake.org) build system. It's compatible with the following runtimes:

- Node.js 4.5+
- [NW.js](https://github.com/nwjs/nw.js): all CMake.js based native modules are compatible with NW.js out-of-the-box, there is no [nw-gyp like magic](https://github.com/nwjs/nw.js/wiki/Using-Node-modules#3rd-party-modules-with-cc-addons) required
- [Electron](https://github.com/atom/electron) (formerly known as atom-shell): out-of-the-box build support, [no post build steps required](https://github.com/atom/electron/blob/master/docs/tutorial/using-native-node-modules.md)

### Supported native libraries

- **Boost**: it's supported by a separate module called boost-lib, that manages Boost dependencies, downloads and installs appropriate Boost versions from Github, and compiles its required libraries automatically. See the [readme](https://github.com/unbornchikken/boost-lib) and the [tutorial](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-04-Creating-CMake.js-based-native-modules-with-Boost-dependency).

## Why CMake?
Nearly every native addon is using node-gyp today, so what's wrong with it?

1. First of all, Google, the creator of the gyp platform is moving
towards its new build system called [gn](https://code.google.com/p/chromium/wiki/gn),
which means gyp's days of support are counted. (Just for the record, despite the announced gn switch,
there is [Bazel](https://github.com/google/bazel) in the works, so sooner or later gn will be dropped in favor of it - IMHO.)

2. It uses Python 2 which is a huge PITA in the current century, and because of the above, there is no hope for upgrade,
see: [node-gyp Issue #193](https://github.com/TooTallNate/node-gyp/issues/193).

3. While gyp is very good in dependency management and project generation,
it still lacks features of essential build customization
(see: [gyp wiki - Custom_build_steps](https://code.google.com/p/gyp/wiki/GypUserDocumentation#Custom_build_steps)).

4. [Its wiki](http://code.google.com/p/gyp/w/list) might be enough for an inhouse project,
but far from what can be called for a good product documentation.

5. If you wanna port a native library to node as an addon,
there is a (very-very) good chance that it doesn't use gyp for its build system,
you have to make gyp binding by hand, which is really hard or nearly impossible considering the previous bulletpoint.
Also you have to be an expert of the given build system **and** gyp to do it right.

6. There is no IDE that supports gyp as a native project format. Gyp can be used to generate IDE projects,
but this is not a two way operation, if you tune your settings or setup in the IDE,
you have to propagate changes back to gyp files by hand.

7. Gyp itself isn't capable to build node modules,
there is fair amount custom JS code in node-gyp module to make it capable to doing so
(that's why it named as Generate Your Project not Build Your Project).
So supporting advanced build features like Ninja generators is impossible without extra development effort added to node-gyp
(see [node-gyp PR #429](https://github.com/TooTallNate/node-gyp/pull/429)).
It looks like [node-gyp support itself eats up development resources](https://github.com/TooTallNate/node-gyp/issues),
so there won't be new features like this added or merged in the near future.
So with node-gyp you are stuck to good old Make which makes build times very long while working on large modules.

So, let's take a look at CMake compared to the above bullet points.

1. Cmake is quite mature and very widely used, making it quite stable and convenient. It's used by projects like
[Blender](http://wiki.blender.org/index.php/Dev:Doc/Building_Blender/Linux/Ubuntu/CMake),
[LLVM](http://llvm.org/docs/CMake.html), [MySQL or Netflix](http://www.cmake.org/success/),
and it isn't likely to be abandoned in the near future.

2. It's native software, having no dependencies to any runtime.

3. Right now CMake has all of the features that
[were missing when development of gyp started](https://code.google.com/p/gyp/wiki/GypVsCMake), and on top of that
it still has those features that gyp didn't have since then.
It has an own module ecosystem with [internal modules](http://www.cmake.org/cmake/help/v3.2/manual/cmake-modules.7.html),
and with 3rd party gems like [Compile Time Reducer (Cotire)](https://github.com/sakra/cotire).

4. CMake has [excellent documentation](http://www.cmake.org/documentation/),
lots of [tutorials](https://www.google.hu/webhp?sourceid=chrome-instant&ion=1&espv=2&ie=UTF-8#q=cmake%20tutorial),
and [examples](https://www.google.hu/webhp?sourceid=chrome-instant&ion=1&espv=2&ie=UTF-8#q=cmake+example).

5. If you pick a native cross platform library, there is a very good chance that is uses CMake as of its build system,
or it has CMake build files somewhere,
for example: [Shark](http://image.diku.dk/shark/sphinx_pages/build/html/rest_sources/getting_started/installation.html),
[Lua](https://github.com/LuaDist/lua), [SDL](http://wiki.libsdl.org/Installation).
If not, [there are converters](http://www.cmake.org/Wiki/CMake#Converters_from_other_buildsystems_to_CMake)
that helps you to create CMake files from other project formats.

6. CMake is widely supported by major cross platform C++ IDEs
like: [QtCreator](http://doc.qt.io/qtcreator/creator-project-cmake.html), [KDevelop](https://www.kdevelop.org/)
and the upcoming [CLion](https://www.jetbrains.com/clion/#cmake-support) from JetBrains.
With CMake.js you are gonna be able to develop Node.js addons by using those,
even you have the ability to use features like integrated debugging.

7. CMake.js module doesn't build your project, CMake does.
All of its commands (configure, build, clean, etc.) are simple CMake invocations without involving JS magic anywhere.
Even you can print CMake command line with CMake.js module for each command (eg.: cmake-js print-configure, cmake-js print-build, cmake-js print-clean).
This means supporting new features of a given native build system (like new version of Ninja or Visual Studio)
won't involve developer efforts from CMake.js side, installing new versions of CMake will be enough.

## Installation

```bash
npm install -g cmake-js
```

**Help:**

```bash
cmake-js --help
```

```
Usage: cmake-js [<command>] [options]

Commands:
  install          Install Node.js/io.js distribution files if needed
  configure        Configure CMake project
  print-configure  Print the configuration command
  build            Build the project (will configure first if required)
  print-build      Print the build command
  clean            Clean the project directory
  print-clean      Print the clean command
  reconfigure      Clean the project directory then configure the project
  rebuild          Clean the project directory then build the project
  compile          Build the project, and if build fails, try a full rebuild

Options:
  --version              Show version number                           [boolean]
  -h, --help             show this screen                              [boolean]
  -l, --log-level        set log level (silly, verbose, info, http, warn,
                         error), default is info                        [string]
  -d, --directory        specify CMake project's directory (where CMakeLists.txt
                         located)                                       [string]
  -D, --debug            build debug configuration                     [boolean]
  -c, --cmake-path       path of CMake executable                       [string]
  -m, --prefer-make      use Unix Makefiles even if Ninja is available (Posix)
                                                                       [boolean]
  -x, --prefer-xcode     use Xcode instead of Unix Makefiles           [boolean]
  -g, --prefer-gnu       use GNU compiler instead of default CMake compiler, if
                         available (Posix)                             [boolean]
  -G, --generator        use specified generator                        [string]
  -t, --toolset          use specified toolset                          [string]
  -T, --target           only build the specified target                [string]
  -C, --prefer-clang     use Clang compiler instead of default CMake compiler,
                         if available (Posix)                          [boolean]
  -r, --runtime          the runtime to use                             [string]
  -v, --runtime-version  the runtime version to use                     [string]
  -a, --arch             the architecture to build in                   [string]
  --CD                   Custom argument passed to CMake in format:
                         -D<your-arg-here>                              [string]
  -i, --silent           Prevents CMake.js to print to the stdio       [boolean]
  -O, --out              Specify the output directory to compile to, default is
                         projectRoot/build                              [string]
                         projectRoot/build                              [string]
```

**Requirements:**

- [CMake](http://www.cmake.org/download/)
- A proper C/C++ compiler toolchain of the given platform
    - **Windows**:
        - [Visual C++ Build Tools](http://landinghub.visualstudio.com/visual-cpp-build-tools)
        or a recent version of Visual C++ will do ([the free Community](https://www.visualstudio.com/products/visual-studio-community-vs) version works well)
    - **Unix/Posix**:
        - Clang or GCC
        - Ninja or Make (Ninja will be picked if both present)

## Usage

### General

In a nutshell. *(For more complete documentation please see [the first tutorial](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-01-Creating-a-native-module-by-using-CMake.js-and-NAN).)*

- Install cmake-js for your module `npm install --save cmake-js`
- Put a CMakeLists.txt file into you module root with this minimal required content:

```cmake
project (your-addon-name-here)
include_directories(${CMAKE_JS_INC})
file(GLOB SOURCE_FILES "your-source files-location-here")
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})
```

- Add the following into your package.json scripts section:

```json
"scripts": {
    "install": "cmake-js compile"
  }
```

#### Commandline

In your module folder you can access cmake-js commands if you install cmake-js globally:

```
npm install -g cmake-js
```

Please refer to the `--help` for the lists of available commands (they are like commands in `node-gyp`).

You can override the project default runtimes via `--runtime` and `--runtime-version`, such as: `--runtime=electron --runtime-version=0.26.0`. See below for more info on runtimes.

### CMake Specific

`CMAKE_JS_VERSION` variable will reflect the actual CMake.js version. So CMake.js based builds could be detected, eg.:

```cmake
if (CMAKE_JS_VERSION)
    add_subdirectory(node_addon)
else()
    add_subdirectory(other_subproject)
endif()
```

### NPM Config Integration

You can set npm configuration options for CMake.js.

For all users (global):

```
npm config set cmake_<key> <value> --global
```

For current user:

```
npm config set cmake_<key> <value>
```

CMake.js will set a variable named `"<key>"` to `<value>` (by using `-D<key>="<value>"` option). User's settings will **overwrite** globals.

UPDATE:

You can set CMake.js commandline arguments with npm config with the following pattern:

```
npm config set cmake_js_G "Visual Studio 56 Win128"
```

Which sets the CMake generator, basically defaults to:

```
cmake-js -G "Visual Studio 56 Win128"
```

#### Example:

Enter at command prompt:

```
npm config set cmake_BuBu="kittyfck"
```

Then write to your CMakeLists.txt the following:

```cmake
message (STATUS ${BuBu})
```

This will print during configure:

```
--- kittyfck
```

### Custom CMake options

You can add custom CMake options by beginning option name with `CD`.

#### Example

In command prompt:
```
cmake-js compile --CDBUBU="kittyfck"
```

Then in your CMakeLists.txt:

```cmake
message (STATUS ${BUBU})
```

This will print during configure:

```
--- kittyfck
```

### Runtimes

You can configure runtimes for compiling target for all depending CMake.js modules in an application. Define a `cmake-js` key in the application's root `package.json` file, eg.:

```json
{
  "name": "ta-taram-taram",
  "description": "pa-param-pam-pam",
  "version": "1.0.0",
  "main": "app.js",
  "cmake-js": {
    "runtime": "node",
    "runtimeVersion": "0.12.0",
    "arch": "ia32"
  }
}
```

Available settings:

- **runtime**: application's target runtime, possible values are:
	- `node`: Node.js
	- `nw`: nw.js
	- `electron`: Electron
- **runtimeVersion**: version of the application's target runtime, for example: `0.12.1`
- **arch**: architecutre of application's target runtime (eg: `x64`, `ia32`, `arm`). *Notice: on non-Windows systems the C++ toolset's architecture's gonna be used despite of this setting. If you don't specify this on Windows, then architecture of the main node/io.js runtime is gonna be used, so you have to choose a matching nw.js runtime.*

#### Runtime options in CMakeLists.txt

The actual node runtime parameters are detectable in CMakeLists.txt files, the following variables are set:

- **NODE_RUNTIME**: `"node"`, `"nw"`, `"electron"`
- **NODE_RUNTIMEVERSION**: for example: `"0.12.1"`
- **NODE_ARCH**: `"x64"`, `"ia32"`, `"arm"`

#### NW.js

To make compatible your NW.js application with any CMake.js based modules, write the following to your application's package.json file:

```json
{
  "cmake-js": {
    "runtime": "nw",
    "runtimeVersion": "nw.js-version-here",
    "arch": "whatever-setting-is-appropriate-for-your-application's-windows-build"
  }
}
```

That's it. There is nothing else to do either on the application's or on the module's side, CMake.js modules are compatible with NW.js out-of-the-box. For more complete documentation please see [the third tutorial](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-03-Using-CMake.js-based-native-modules-with-nw.js).

#### Electron

To make compatible your Electron application with any CMake.js based modules, write the following to your application's package.json file:

```json
{
  "cmake-js": {
    "runtime": "electron",
    "runtimeVersion": "electron-runtime-version-here",
    "arch": "whatever-setting-is-appropriate-for-your-application's-windows-build"
  }
}
```

That's it. There is nothing else to do either on the application's or on the module's side, CMake.js modules are compatible with Electron out-of-the-box.

##### Note
Currently Electron (V1.4.x+) can only call modules built using CMake.js from the main process. To call such a module from a render process use the Electron [remote](https://github.com/electron/electron/blob/master/docs/api/remote.md) module in your require statement:

```var yourModule = require('electron').remote.require('pathToYourModule/cmakeModuleName.node')```

#### Important

It is important to understand that this setting is to be configured in the **application's root package.json file**. If you're creating a native module targeting nw.js for example, then **do not specify anything** in your module's package.json. It's the actual application's decision to specify its runtime, your module's just compatible anything that was mentioned in the [About chapter](#about). Actually defining `cmake-js` key in your module's package.json file may lead to an error. Why? If you set it up to use nw.js 0.12.1 for example, then when it gets compiled during development time (to run its unit tests for example) it's gonna be compiled against io.js 1.2 runtime. But if you're having io.js 34.0.1 at the commandline then, which is binary incompatible with 1.2, then your unit tests will fail for sure. So it is advised to not use cmake-js target settings in your module's package.json, because that way CMake.js will use that you have, and your tests will pass.

#### Heroku
[Heroku](https://heroku.com) uses the concept of a [buildpack](https://devcenter.heroku.com/articles/buildpacks) to define
how an application should be prepared to run in a [dyno](https://devcenter.heroku.com/articles/dynos).
The typical buildpack for note-based applications,
[heroku/nodejs](https://github.com/heroku/heroku-buildpack-nodejs),
provides an environment capable of running [node-gyp](https://github.com/TooTallNate/node-gyp),
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


#### N-API and `node-addon-api`

[ABI-stable Node.js API
(N-API)](https://nodejs.org/api/n-api.html) are a set of experimental C
APIs that allow to compile a native module and have it loaded by
different versions of Node.js that provide the N-API. At the moment,
only Node.js v8.0.0 implements and exports N-API symbols under the flag
`--napi-modules`:

    node --napi-modules index.js

To compile a native module that uses only the
[plain `C` N-API calls](https://github.com/nodejs/node/blob/v8.x/src/node_api.h),
follow the directions for plain `node` native modules.

To compile a native module that uses the header-only C++ wrapper
classes provided by
[`node-addon-api`](https://github.com/nodejs/node-addon-api),
you need at the moment to make your package depend on it with

    npm install --save-dev node-addon-api

and add it to the include directories of your *CMake* project file
`CMakeLists.txt`:

```cmake

# Include N-API wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR})

```


## Tutorials

- [TUTORIAL 01 Creating a native module by using CMake.js and NAN](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-01-Creating-a-native-module-by-using-CMake.js-and-NAN)
- [TUTORIAL 02 Creating CMake.js based native addons with Qt Creator](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-02-Creating-CMake.js-based-native-addons-with-QT-Creator)
- [TUTORIAL 03 Using CMake.js based native modules with NW.js](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-03-Using-CMake.js-based-native-modules-with-nw.js)
- [TUTORIAL 04 Creating CMake.js based native modules with Boost dependency](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-04-Creating-CMake.js-based-native-modules-with-Boost-dependency)

## Use case in the works - ArrayFire.js

I'm working on the Node.js port of the awesome [ArrayFire](http://arrayfire.com/) CPU/GPU computing library, please follow its status in its repo: [ArrayFire.js](https://github.com/arrayfire/arrayfire_js).

## Changelog

View [changelog.md](changelog.md)

## Credits

- [Ivshti (Ivo Georgiev)](https://github.com/Ivshti) - Electron support
- [Johan (JohanvdWest)](https://github.com/JohanvdWest) - option for supporting pre C++11 compilers
- [javedulu](https://github.com/javedulu) option to generate Xcode project (-x, --prefer-xcode)
- [Gerhard Berger](https://github.com/gerhardberger) - Custom CMake parameter support, silent and out parameters
- [d3x0r](https://github.com/d3x0r) - "G" option for supporting cutom generators, various fixes
- [AlessandroA](https://github.com/AlessandroA) - "T" option for building a specified target
- [pirxpilot](https://github.com/pirxpilot) - various dependency upgrades
- [VictorLeach96](https://github.com/VictorLeach96) - tolset commandlien option
- [Arnaud Botella](https://github.com/BotellaA) - Case sensitive npm config
- [Jeremy Apthorp](https://github.com/nornagon) - Support for Electron v4+
- [Gregor Jasny](https://github.com/gjasny) - CMake 3.14 support
- [Rogério Ribeiro da Cruz](https://github.com/rogeriorc) - Windows delay load hook, Electron 4+ compatibility