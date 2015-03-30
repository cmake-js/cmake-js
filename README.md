# CMake.js (MIT)

## WTF?
CMake.js is a Node.js/io.js native addon build tool which is works *exactly* like [node-gyp](https://github.com/TooTallNate/node-gyp), but instead of [gyp](http://en.wikipedia.org/wiki/GYP_%28software%29), it is based on [CMake](http://cmake.org) build system.

## Why CMake?
Nearly every native addon is using node-gyp today, so what's wrong with it?

1. Fist of all, Google, the creator of the gyp platform is moving, towards it's new build system called [gn](https://code.google.com/p/chromium/wiki/gn), which means days of support are counted. 
(Just for the record, despite the announced gn switch, there is [Bazel](https://github.com/google/bazel) in the works, so sooner or later gn will be dropped in favor of it - IMHO.)
2. It uses Python 2, and because of the above, there is no hope for upgrade ever, see: https://github.com/TooTallNate/node-gyp/issues/193
3. While gyp is very good in dependency management and project generation, 
it still lacks features of essential build customization like \*.h.in transformations 
(see: [gyp wiki - Custom_build_steps](https://code.google.com/p/gyp/wiki/GypUserDocumentation#Custom_build_steps)).
4. If you wanna port a native library to node as an addon, there is a (very-very) good chance that it doesn't use gyp for its build system, 
you have to make gyp binding by hand, which is really hard or nearly impossible considering the previous bulletpoint.
5. There is no IDE that supports gyp as a native project format. Gyp can be used to generate IDE projects, but this is not a two way operation, 
if you tune your settings or setup in the IDE, you have to propagate changes back to gyp files by hand.
6. Gyp itself isn't capable to build node modules, there is fair amount custom JS code in node-gyp module to make it capable to doing so. 
So supporting advanced build features like Ninja generators is impossible without extra development effort added to node-gyp. 
Because of it [node-gyp support itself eats up development resources](https://github.com/TooTallNate/node-gyp/issues) there won't be new features like this added in the near future. 
So with node-gyp you are stuck to good old Make which makes build times very long while working on large modules. 
 
So, let's take a look at CMake considering the above bulletpoints.

1. 

Install:

```
npm install -g cmake-js
```

Help:

```
cmake-js --help
```