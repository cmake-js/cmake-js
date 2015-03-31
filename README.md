# CMake.js (MIT)

## WTF?
CMake.js is a Node.js/io.js native addon build tool which works *exactly* like 
[node-gyp](https://github.com/TooTallNate/node-gyp), 
but instead of [gyp](http://en.wikipedia.org/wiki/GYP_%28software%29), 
it is based on [CMake](http://cmake.org) build system.

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
Also you have to be and expert of the given build system **and** gyp to do it right.

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
and [example code](https://www.google.hu/webhp?sourceid=chrome-instant&ion=1&espv=2&ie=UTF-8#q=cmake+example).

5. If you pick a native cross platform library, there is a very good chance that is uses CMake as of its build system,
or it has CMake build files somewhere, 
for example: [Shark](http://image.diku.dk/shark/sphinx_pages/build/html/rest_sources/getting_started/installation.html),
[Lua](https://github.com/LuaDist/lua), [SDL](http://wiki.libsdl.org/Installation). 
If not, [there are converters](http://www.cmake.org/Wiki/CMake#Converters_from_other_buildsystems_to_CMake) 
that helps you to create CMake files from other project formats.

6. CMake is widely supported by mayor cross platform C++ IDEs 
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
        
## Tutorials

### Creating a native module by using CMake.js 


