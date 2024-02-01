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
-- See our 'package.json' for some command aliases that can be used to build the demo.
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

  # # copy the types
  # file(COPY
  #   "${CMAKE_CURRENT_LIST_DIR}/lib/demo/demo.node.js"
  #   "${CMAKE_CURRENT_LIST_DIR}/lib/demo/demo.node.ts"
  #   "${CMAKE_CURRENT_LIST_DIR}/lib/demo/demo.node.d.ts"
  #   DESTINATION
  #   "${PROJECT_BINARY_DIR}/lib"
  # )

  if(BUILD_TESTS)
      # include(CTest) # If you want to see all the test dashboard targets, uncomment this include()
      enable_testing()
      include("${CMAKE_CURRENT_LIST_DIR}/tests/demo/tests.cmake")
  endif()

  # offer a basic/messy CPack
  # set(CPACK_PACKAGE_CHECKSUM "${PROJECT_VERSION_TWEAK}") # git rev-parse is a good idea for this...
  set(CPACK_PACKAGE_VENDOR "cmake-js")
  set(CPACK_PACKAGE_NAME              "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-${CMAKE_SYSTEM_NAME}-${CMAKE_SYSTEM_PROCESSOR}")
  set(CPACK_PACKAGE_FILE_NAME         "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-${CMAKE_SYSTEM_NAME}-${CMAKE_SYSTEM_PROCESSOR}") # Compiled binary distribution
  set(CPACK_SOURCE_PACKAGE_FILE_NAME  "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-Source") # No system spec as this is un-compiled source file distribution
  set(CPACK_PACKAGE_DESCRIPTION_SUMMARY ${PROJECT_DESCRIPTION})
  set(CPACK_PACKAGE_VERSION_MAJOR ${PROJECT_VERSION_MAJOR})
  set(CPACK_PACKAGE_VERSION_MINOR ${PROJECT_VERSION_VERSION_MINOR})
  set(CPACK_PACKAGE_VERSION_PATCH ${PROJECT_VERSION_VERSION_PATCH})
  set(CPACK_PACKAGE_VERSION_TWEAK ${PROJECT_VERSION_VERSION_TWEAK})
  set(CPACK_RESOURCE_FILE_LICENSE ${PROJECT_SOURCE_DIR}/LICENSE)
  set(CPACK_RESOURCE_FILE_README  ${PROJECT_SOURCE_DIR}/README.md)
  set(CPACK_INCLUDE_TOPLEVEL_DIRECTORY OFF)
  set(CPACK_COMPONENT_INCLUDE_TOPLEVEL_DIRECTORY OFF)
  set(CPACK_SOURCE_GENERATOR "TGZ;ZIP")
  set(CPACK_SOURCE_IGNORE_FILES
      _CPack_Packages
      /*.zip
      /*.tar
      /*.tar.*
      /.env*
      /.git/*
      /.cmake
      /.github
      /.vs
      /.vscode
      /.cache
      /.config
      /.local
      /doc
      /docs
      #/bin
      #/lib
      /usr
      /out
      /build
      /Release
      /Debug
      /MinSizeRel
      /RelWithDebInfo
      /downloads
      /installed
      /install
      /node_modules
      /vcpkg
      /.*build.*
      /package-lock.json
      /yarn.lock
      /\\\\.DS_Store
  )
  include(CPack)

endif ()

# Happy building!
