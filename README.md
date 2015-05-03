# CMake.js (MIT)

## About
CMake.js is a Node.js/io.js native addon build tool which works *exactly* like [node-gyp](https://github.com/TooTallNate/node-gyp), but instead of [gyp](http://en.wikipedia.org/wiki/GYP_%28software%29), it is based on [CMake](http://cmake.org) build system. It's compatible with the following runtimes: 

- Node.js 0.10+
- io.js
- nw.js (all CMake.js based native modules are compatible with nw.js out-of-the-box, there is no [nw-gyp like magic](https://github.com/nwjs/nw.js/wiki/Using-Node-modules#3rd-party-modules-with-cc-addons) required)

## Why CMake?
Nearly every native addon is using node-gyp today, so what's wrong with it?

1. Fist of all, Google, the creator of the gyp platform is moving
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
 
So, let's take a look at CMake compared to the above bulletpoints.

1. Cmake is quite mature and very widely used, making it quite stable and convenient. It's used by projects like 
[Blender](http://wiki.blender.org/index.php/Dev:Doc/Building_Blender/Linux/Ubuntu/CMake), 
[LLVM](http://llvm.org/docs/CMake.html), [MySQL or Netflix](http://www.cmake.org/success/),
and it isn't likely to be abandoned in the near future. 

2. It's a native software having no dependencies to any runtime.

3. Right now CMake have all of the features that 
[was missing when development of gyp started](https://code.google.com/p/gyp/wiki/GypVsCMake), and on top of that
it still have those features that gyp doesn't have since then. 
It has an own module ecosystem with [internal modules](http://www.cmake.org/cmake/help/v3.2/manual/cmake-modules.7.html), 
and with 3rd party gems like [Compile Time Reducer (Cotire)](https://github.com/sakra/cotire).

4. CMake have an [excellent documentation](http://www.cmake.org/documentation/), 
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

```
npm install -g cmake-js
```

**Help:**

```
cmake-js --help
```

**Requirements:**

- [CMake](http://www.cmake.org/download/)
- A proper C/C++ compiler toolchain of the given platform
    - **Windows**: a recent version of Visual C++ will do ([the free Community](https://www.visualstudio.com/en-us/news/vs2013-community-vs.aspx) version works well)             
    - **Unix/Posix**: 
        - Clang or GCC (Clang will be picked if both present)
        - Ninja or Make (Ninja will be picked if both present)

## Usage

### General

In a nutshell. *(For more complete documentation please see [the first tutorial](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-01-Creating-a-native-module-by-using-CMake.js-and-NAN).)*

- Install cmake-js for you module `npm install --save cmake-js`
- Put a CMakeLists.txt file into you module root with this minimal required content:

```cmake
project (your-addon-name-here)
include_directories(${CMAKE_JS_INC})
file(GLOB SOURCE_FILES "your-source files-location-here")
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})
```

- Add the following into your package.json scripts section:

```json
"scripts": {
    "install": "node ./node_modules/cmake-js/bin/cmake-js rebuild"
  }
```

In your module folder you can access cmake-js commands if you install cmake-js globally:

```
npm install -g cmake-js
```

Please refer to the `--help` for the lists of available commands (they are like commands in `node-gyp`).

### Runtimes

You can configure runtimes for compiling target for all depending CMake.js modules in an application. Define a `cmake-js` key in `config` section of the root application's `package.json` file, eg.:

```json
{
  "name": "ta-taram-taram",
  "description": "pa-param-pam-pam",
  "version": "1.0.0",
  "main": "app.js",
  "config": {
    "cmake-js": {
      "runtime": "node",
      "runtimeVersion": "0.12.0",
      "arch": "ia32"
    }
  }
}
```

Available settings:

- **runtime**: application's target runtime, possible values are: 
	- `node`: Node.js
	- `iojs`: io.js
	- `nw`: nw.js
- **runtimeVersion**: version of the application's target runtime, for example: `0.12.1`
- **arch**: architecutre of appication's target runtime (eg: `x64`, `ia32`, `arm`). *Notice: on non-Windows systems C++ toolset's architecture's gonna be used despite of this setting.*

#### nw.js

To make compatible your nw.js application with any CMake.js based modules, write the following to your application's package.json file:

**on Windows**:

```json
{
  "config": {
    "cmake-js": {
      "runtime": "nw",
      "runtimeVersion": "nw.js-version-here",
      "arch": "enter-nw.js-runtime's-architecture-here"
    }
  }
}
```

**on Posix**:

```json
{
  "config": {
    "cmake-js": {
      "runtime": "nw",
      "runtimeVersion": "nw.js-version-here"
    }
  }
}
```

That's it. There is nothing else to do either on the application's or on the module's side, CMake.js modules are compatible with nw.js out-of-the-box. For more complete documentation please see [the third tutorial](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-03-Using-CMake.js-based-native-modules-with-nw.js).

## Tutorials

- [TUTORIAL 01 Creating a native module by using CMake.js and NAN](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-01-Creating-a-native-module-by-using-CMake.js-and-NAN)
- [TUTORIAL 02 Creating CMake.js based native addons with Qt Creator](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-02-Creating-CMake.js-based-native-addons-with-QT-Creator)
- [TUTORIAL 03 Using CMake.js based native modules with nw.js](https://github.com/unbornchikken/cmake-js/wiki/TUTORIAL-03-Using-CMake.js-based-native-modules-with-nw.js)
