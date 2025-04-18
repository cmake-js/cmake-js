# CMakeJS.cmake

[A CMake first API for using cmake-js](https://github.com/cmake-js/cmake-js/issues/310)

This is a complete from the ground up rework of how this project operates, aiming to solve 2 key problems:

1. Getting IDE integration working requires reinventing a large chunk of what this library did
2.

The focus on this iteration is putting CMake first, with some light JS wrappings for DX.  
This means that any project using this library should be possible to build directly with cmake without needing any arguments (assuming cmake and compilers are on the PATH).  
And any configuration of the building should be done inside the users CMakeLists.txt file, with common tasks utilising functions we provide.

At this stage this is an opt-in flow, but in a future major version this will likely become the only supported approach.

## Minimal setup

Builders are able to get Addons to compile and run using a very minimal CMake build script:

```.cmake
# CMakeLists.txt

cmake_minimum_required(VERSION 3.15)

# path to CMakeJS.cmake
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")
include(CMakeJS)

project (demo)

cmakejs_setup_node_api_c_library()

cmakejs_create_node_api_addon(addon
    # SOURCES:
    src/hello/addon.cc
)

```

... and that's all you need!

## Extended functionality

The module strives to be unopinionated by providing reasonable fallback behaviours that align closely with typical, expected CMake building conventions.

Optionally, more Addon targets can be created from this API under one single project tree, and helpful variables may also be configured:

```.cmake
cmakejs_create_node_api_addon (
  # The 'NAME' arg given to the addon target defines 'CMAKEJS_ADDON_NAME'
  addon_v7
  # The 'NAPI_VERSION' arg defines 'NAPI_VERSION' directly. If not set, defaults to 8.
  NAPI_VERSION 7
  # The 'NAMESPACE' arg defines 'NAPI_CPP_CUSTOM_NAMESPACE'. If not set, the addon target name is used instead.
  NAMESPACE v7
  # The 'ALIAS' arg defines 'CMAKEJS_ADDON_ALIAS' for an alias target name. If not set, 'NAPI_CPP_CUSTOM_NAMESPACE' is used instead.
  ALIAS addon::v7
)

cmakejs_nodejs_addon_add_sources (addon_v7
  # Specify an exact directory for this addon's SOURCES
  BASE_DIRS "${PROJECT_SOURCE_DIR}/src"
  src/demo/addon.cpp
)

cmakejs_nodejs_addon_add_definitions (addon_v7
  # 'PRIVATE', 'PUBLIC', and 'INTERFACE' definitions are all supported.
  PRIVATE
  # The Napi Addon API has several other useful pre-processor definitions.
  # These can be specified here. Example:
  NAPI_CPP_EXCEPTIONS_MAYBE
  # (See '<Napi.h>' source file for the default exceptions policy handling.)
)
```

## Builds with either cmake-js or CMake

All that it takes to compile and run the above minimal build script is to call cmake-js from `package.json`:

```.sh
$ npm run install
```

or

```.sh
$ yarn install
```

_However_, the `CMakeJS.cmake` script does _not depend on being executed by cmake-js_, and can build addons independently of npm/yarn, using just native CMake commands:

```.sh
$ cmake --fresh -S . -B ./build

# ...

$ cmake --build ./build
```

Because of the above, IDE tooling integration should also be assured.

## Deeper CMake integration

By exporting an interface library under cmake-js' own namespace - `cmake-js::cmake-js`, the CMakeJS.cmake file can easily be shipped in the cmake-js package tree, making the NodeJS Addon API automatically available to builders by simply having the cmake-js CLI pass in `-DCMAKE_MODULE_PATH:PATH=/path/to/CMakeJS.cmake` (pointing at the dir, not the file!), as well as providing the usual/expected means of integration with vcpkg, and other conventional CMake module consumers.

If the module is appended via the CLI as above, then builders may activate `CMakeJS.cmake` programatically by calling `include(CMakeJS)` in their CMake project.

Alternatively to using the module path on the CLI and activating the module programmatically, they can instead `include("${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake/CMakeJS.cmake")` and the module will be activated on inclusion.

`CMakeJS.cmake` exports the following CMake targets for linkage options:

```
cmake-js::node-dev        // The NodeJS system installation developer files
cmake-js::node-api        // The C Addon API
cmake-js::node-addon-api  // The C++ Addon API
cmake-js::cmake-js        // The full set of configured Addon API dependencies
```
