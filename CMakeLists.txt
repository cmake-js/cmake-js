#[=============================================================================[
  cmake-js 7.3.3
  Copyright (C) 2024
  MIT License

]=============================================================================]#

cmake_minimum_required(VERSION 3.15)
cmake_policy(VERSION 3.15)

project (CMakeJS
  VERSION 7.3.3
  DESCRIPTION "CMake.js - a Node.js native addon build tool"
  HOMEPAGE_URL "https://github.com/cmake-js/cmake-js"
  LANGUAGES C CXX
)

include ("${CMAKE_CURRENT_LIST_DIR}/share/CMakeJS.cmake")

# If this is not a subproject...
if (CMakeJS_IS_TOP_LEVEL)

  # ... build the demo project
  message (STATUS "cmake-js: Building demo project")

  cmakejs_create_napi_addon (
    # NAME
    addon
    # SOURCES
    src/demo/addon.cpp
  )

endif ()
