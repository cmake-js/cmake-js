# CMakeJS.cmake

[A proposed CMake API for cmake-js v8](https://github.com/cmake-js/cmake-js/issues/310)

![CTest](https://github.com/nathanjhood/NapiAddon/actions/workflows/test.yaml/badge.svg)

This file is a CMake module that builders can append to their project's ```CMAKE_MODULE_PATH```, and then easily create a new NodeJS C++ Addon as a CMake target by using [```cmakejs_create_napi_addon(<NAME> <SOURCES>)```](https://github.com/nathanjhood/NapiAddon/tree/main#minimal-setup), which creates a target with all the reasonable defaults taken care of for building a Napi Addon - but, intermediate/advanced users still have scope to override any of these defaults by using the usual ```target_compile_definitions()``` and such forth on their Addon target(s), if they so wish.

The proposed API also does not clash with any pre-existing projects, by not imposing itself on users unless they specifically call the function within their build script. Adoption of this proposed API would be entirely optional, and especially helpful for newcomers.

```CMakeJS.cmake``` is fully compatible with the latest cmake-js release without any changes to source.

## Minimal setup

Builders are able to get Addons to compile and run using a very minimal CMake build script:

```.cmake
# CMakeLists.txt

cmake_minimum_required(VERSION 3.15)

# path to CMakeJS.cmake
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")

include(CMakeJS)

project (demo)

cmakejs_create_napi_addon(
  # NAME
  addon
  # SOURCES
  src/demo/addon.cpp
)

```

... and that's all you need!

## Extended functionality

The module strives to be unopinionated by providing reasonable fallback behaviours that align closely with typical, expected CMake building conventions.

Optionally, more Addon targets can be created from this API under one single project tree, and helpful variables may also be configured:

```.cmake
cmakejs_create_napi_addon (
  # The 'NAME' arg given to the addon target defines 'CMAKEJS_ADDON_NAME'
  addon_v7
  # The 'NAPI_VERSION' arg defines 'NAPI_VERSION' directly. If not set, defaults to 8.
  NAPI_VERSION 7
  # The 'NAMESPACE' arg defines 'NAPI_CPP_CUSTOM_NAMESPACE'. If not set, the addon target name is used instead.
  NAMESPACE v7
  # The 'ALIAS' arg defines 'CMAKEJS_ADDON_ALIAS' for an alias target name. If not set, 'NAPI_CPP_CUSTOM_NAMESPACE' is used instead.
  ALIAS addon::v7
)

cmakejs_napi_addon_add_sources (addon_v7
  # Specify an exact directory for this addon's SOURCES
  BASE_DIRS "${PROJECT_SOURCE_DIR}/src"
  src/demo/addon.cpp
)

cmakejs_napi_addon_add_definitions (addon_v7
  # 'PRIVATE', 'PUBLIC', and 'INTERFACE' definitions are all supported.
  PRIVATE
  # The Napi Addon API has several other useful pre-processor definitions.
  # These can be specified here. Example:
  NAPI_CPP_EXCEPTIONS_MAYBE
  # (See '<Napi.h>' source file for the default exceptions policy handling.)
)
```

## Backwards compatible

Projects built with cmake-js that don't consume this proposed API would not be affected at all by this module's existence. So, the previous 'manual' way of creating addons with cmake-js will still work, and can even be mixed with targets that use the new API, under the same project tree. Even if the functions are not adopted, builders can still get a little extra help by linking with the ```cmake-js::cmake-js``` interface library:

```.cmake
# including the module will automatically make 'cmake-js::cmake-js' available...
include(CMakeJS)

add_library(addon_v6 SHARED src/demo/addon.cpp)
set_target_properties(addon_v6 PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(addon_v6 PRIVATE cmake-js::cmake-js) # link to resolve all dependencies!
```

The above target should build, while leaving the rest of the target's manual implementation up to the builder.

## Builds with either cmake-js or CMake

All that it takes to compile and run the above minimal build script is to call cmake-js from ```package.json```:

```.sh
$ npm run install
```

or

```.sh
$ yarn install
```

*However*, the ```CMakeJS.cmake``` script does *not depend on being executed by cmake-js*, and can build addons independently of npm/yarn, using just native CMake commands (see [this demo ```package.json```](https://github.com/nathanjhood/NapiAddon/blob/main/package.json) for some more):

```.sh
$ cmake --fresh -S . -B ./build

# ...

$ cmake --build ./build
```

Because of the above, IDE tooling integration should also be assured.

## CTest and CPack

CTest and CPack have also been carefully tested, to confirm the proposed API's ability to support both.

```.sh
$ ctest -B ./build

# addon tests output...
```

```.sh
$ cpack -B ./build --config CPackConfig.cmake

# doing zip/tar of addon build....

$ cpack -B ./build --config CPackSourceConfig.cmake

# doing zip/tar of addon source code....
```

See [```package.json```](https://github.com/nathanjhood/NapiAddon/blob/main/package.json) for more native CMake/CTest/CPack commands, and how to automate them.

## Deeper CMake integration

By exporting an interface library under cmake-js' own namespace - ```cmake-js::cmake-js```, the CMakeJS.cmake file can easily be shipped in the cmake-js package tree, making the NodeJS Addon API automatically available to builders by simply having the cmake-js CLI pass in ```-DCMAKE_MODULE_PATH:PATH=/path/to/CMakeJS.cmake``` (pointing at the dir, not the file!), as well as providing the usual/expected means of integration with vcpkg, and other conventional CMake module consumers.

If the module is appended via the CLI as above, then builders may activate ```CMakeJS.cmake``` programatically by calling ```include(CMakeJS)``` in their CMake project.

Alternatively to using the module path on the CLI and activating the module programmatically, they can instead ```include("${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake/CMakeJS.cmake")``` and the module will be activated on inclusion.

Builders will also find that their cmake-js - powered Addon targets also work well with CMake's ```export()``` and ```install()``` routines, meaning that their Addon projects also work as CMake modules.

```CMakeJS.cmake``` exports the following CMake targets for linkage options:

```
cmake-js::node-dev        // The NodeJS system installation developer files
cmake-js::node-api        // The C Addon API
cmake-js::node-addon-api  // The C++ Addon API
cmake-js::cmake-js        // The full set of configured Addon API dependencies
```
