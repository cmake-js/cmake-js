#[=============================================================================[
  cmake-js v7.3.3
  Copyright (C) 2024
  MIT License
  "CMake.js - a Node.js native addon build tool"
  https://github.com/cmake-js/cmake-js/blob/cmakejs_cmake_api/README.md
]=============================================================================]#

cmake_minimum_required (VERSION 3.15)
cmake_policy (VERSION 3.15)

if (NOT DEFINED CMAKE_BUILD_TYPE)
  set (CMAKE_BUILD_TYPE "Debug")
endif ()

project (CMakeJS
  VERSION 7.3.3
  DESCRIPTION "CMake.js - a Node.js native addon build tool"
  HOMEPAGE_URL "https://github.com/cmake-js/cmake-js"
  LANGUAGES C CXX
)

# (no building into our source tree is allowed)
set (CMakeJS_IS_MASTER_PROJECT FALSE)
if(NOT (PROJECT_SOURCE_DIR STREQUAL PROJECT_BINARY_DIR))
  set (CMakeJS_IS_MASTER_PROJECT TRUE)
endif()

include ("${CMAKE_CURRENT_LIST_DIR}/share/CMakeJS.cmake")

# CMakeJS's own targets are abstract 'INTERFACE' targets which only exist
# within CMake's build cache - so, there is nothing to compile, here.

# We instead offer a simple test/demonstration of our API, and reserve the
# CMakeJS vendor namespace in C++/CMake land.

# If this is not a subproject...
if (CMakeJS_IS_TOP_LEVEL
    # (and we're not building into the source tree)
    AND CMakeJS_IS_MASTER_PROJECT
  )

  cmakejs_create_napi_addon (
    # CMAKEJS_ADDON_NAME
    demo
    # SOURCES
    src/demo/addon.cpp
    # NAPI_CPP_CUSTOM_NAMESPACE
    NAMESPACE CMakeJS
  )

  # ...we're building the CMakeJS demo project
  message (STATUS "cmake-js::demo \n")

  # Tell the user what to do
  message (STATUS [==[
--
-- You may build and test our demo addon target ('demo.node').
--
-- You must use the regular CMake interface to build this demo project (not the cmake-js CLI)!
--
-- The demo target was constructed using our custom CMake API:
--

cmakejs_create_napi_addon (
  # CMAKEJS_ADDON_NAME
  demo
  # SOURCES
  src/demo/addon.cpp
  # NAPI_CPP_CUSTOM_NAMESPACE
  NAMESPACE CMakeJS
)

-- You will be able to load the demo addon in JavaScript code:
--

const demo = require("./build/lib/demo.node");

console.log(`Napi Status:  ${demo.hello()}`);
console.log(`Napi Version: ${demo.version()}`);



-- Read more about our 'CMakeJS.cmake' API here:
-- https://github.com/cmake-js/cmake-js/blob/cmakejs_cmake_api/README.md
--
-- Our demo target uses Napi Addon API (C++)
-- https://nodejs.org/api/addons.html
--
-- See more node addon examples here:
-- https://github.com/nodejs/node-addon-examples
--
--
-- CMake.js - a Node.js native addon build tool. Copyright 2024 MIT.
-- https://github.com/cmake-js/cmake-js
--
-- ]==])

  if(BUILD_TESTS)
      include(CTest) # If you want to see all the test dashboard targets, uncomment this include()
      enable_testing()
      include("${CMAKE_CURRENT_LIST_DIR}/tests/demo/tests.cmake")
  endif()

endif ()

# Happy building!
