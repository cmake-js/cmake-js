#[=============================================================================[
  CMakeJS.cmake - A new CMake first API for cmake-js
  MIT License
  Copyright (C) 2024 Julian Waller
  Copyright (C) 2024 Nathan J. Hood
  https://github.com/cmake-js/cmake-js
]=============================================================================]#

cmake_minimum_required(VERSION 3.15)
cmake_policy(VERSION 3.15)
include(CMakeParseArguments)
include(GNUInstallDirs)
include(CMakeDependentOption)

if (DEFINED CMAKE_JS_VERSION)
  # HACK: this should be re-enabled before this is finalised
  # message(FATAL_ERROR "You cannot use the new cmake flow with the old cmake-js binary, you should use cmake-js2 or cmake instead")
endif()

#[=============================================================================[
Internal helper.
]=============================================================================]#
function(_cmakejs_normalize_path var)
    set(path "${${var}}")
    file(TO_CMAKE_PATH "${path}" path)
    while(path MATCHES "//")
        string(REPLACE "//" "/" path "${path}")
    endwhile()
    string(REGEX REPLACE "/+$" "" path "${path}")
    set("${var}" "${path}" PARENT_SCOPE)
endfunction()

set(_CMAKEJS_DIR "${CMAKE_CURRENT_LIST_DIR}/../.." CACHE INTERNAL "Path to cmake-js directory")

#[=============================================================================[
Get the in-use NodeJS binary for executing NodeJS commands in CMake scripts.

Provides
::
  NODE_EXECUTABLE, the NodeJS runtime binary being used
  NODE_VERSION, the version of the NodeJS runtime binary being used

]=============================================================================]#
function(cmakejs_acquire_node_executable)
  if(NOT DEFINED NODE_EXECUTABLE)
    find_program(NODE_EXECUTABLE
      NAMES "node" "node.exe"
      PATHS "$ENV{PATH}" "$ENV{ProgramFiles}/nodejs"
      DOC "NodeJs executable binary"
      REQUIRED
    )
    if (NOT NODE_EXECUTABLE)
        message(FATAL_ERROR "NodeJS installation not found! Please check your paths and try again.")
        return()
    endif()

    execute_process(
      COMMAND "${NODE_EXECUTABLE}" "--version"
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
      OUTPUT_VARIABLE NODE_VERSION
    )
    string(REGEX REPLACE "[\r\n\"]" "" NODE_VERSION "${NODE_VERSION}")
    set(NODE_VERSION "${NODE_VERSION}" CACHE STRING "" FORCE)

    if(VERBOSE)
        message(STATUS "NODE_EXECUTABLE: ${NODE_EXECUTABLE}")
        message(STATUS "NODE_VERSION: ${NODE_VERSION}")
    endif()
  endif()
endfunction()

if(NOT DEFINED NODE_EXECUTABLE)
  cmakejs_acquire_node_executable()
  message(DEBUG "NODE_EXECUTABLE: ${NODE_EXECUTABLE}")
  message(DEBUG "NODE_VERSION: ${NODE_VERSION}")
endif()

# Find the cmake-js helper
find_program(CMAKEJS_HELPER_EXECUTABLE
  NAMES "cmake-js-helper.mjs"
  PATHS "${_CMAKEJS_DIR}/bin"
  DOC "cmake-js helper binary"
  REQUIRED
)
if (NOT CMAKEJS_HELPER_EXECUTABLE)
  message(FATAL_ERROR "Failed to find cmake-js helper!")
  return()
endif()

_cmakejs_normalize_path(CMAKEJS_HELPER_EXECUTABLE)
string(REGEX REPLACE "[\r\n\"]" "" CMAKEJS_HELPER_EXECUTABLE "${CMAKEJS_HELPER_EXECUTABLE}")

# get the cmake-js version number
execute_process(
  COMMAND "${NODE_EXECUTABLE}" "${CMAKEJS_HELPER_EXECUTABLE}" "version"
  WORKING_DIRECTORY ${_CMAKEJS_DIR}
  OUTPUT_VARIABLE _version
  OUTPUT_STRIP_TRAILING_WHITESPACE
)
if (NOT DEFINED _version OR "${_version}" STREQUAL "")
  message(FATAL_ERROR "Failed to get cmake-js version!")
  return()
endif()

# check multiple versions havent been loaded
if(COMMAND cmakejs_nodejs_addon_add_sources)
    if(NOT DEFINED _CMAKEJS_VERSION OR NOT (_version STREQUAL _CMAKEJS_VERSION))
        message(WARNING "More than one 'CMakeJS.cmake' version has been included in this project.")
    endif()
    # CMakeJS has already been included! Don't do anything
    return()
endif()

set(_CMAKEJS_VERSION "${_version}" CACHE INTERNAL "Current 'CMakeJS.cmake' version. Used for checking for conflicts")
set(_CMAKEJS_SCRIPT "${CMAKE_CURRENT_LIST_FILE}" CACHE INTERNAL "Path to current 'CMakeJS.cmake' script")

# Default build output directory, if not specified with '-DCMAKEJS_BINARY_DIR:PATH=/some/dir'
if(NOT DEFINED CMAKEJS_BINARY_DIR)
    set(CMAKEJS_BINARY_DIR "${CMAKE_BINARY_DIR}")
endif()

message (STATUS "Using cmake-js v${_CMAKEJS_VERSION}")

if(MSVC)
  set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>" CACHE STRING "Select the MSVC runtime library for use by compilers targeting the MSVC ABI." FORCE)
endif()


#[=============================================================================[
Get NodeJS C Addon development files.

Provides
::
  NODE_API_HEADERS_DIR, where to find node_api.h, etc.
  NODE_API_INC_FILES, the headers required to use Node API.

]=============================================================================]#
function(cmakejs_acquire_node_api_c_headers)
 # Acquire if needed...
  if(NOT DEFINED NODE_API_HEADERS_DIR) # Why the NODE_API_* namespace? Because 'node-api-headers' from vcpkg also provides this exact var, so we can help users from vcpkg-land avoid picking up headers they already have
    execute_process(
      COMMAND "${NODE_EXECUTABLE}" -p "require('node-api-headers').include_dir"
      WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
      OUTPUT_VARIABLE NODE_API_HEADERS_DIR
      # COMMAND_ERROR_IS_FATAL ANY - crashes on ARM64 builds? unfortunate!
    )
    string(REGEX REPLACE "[\r\n\"]" "" NODE_API_HEADERS_DIR "${NODE_API_HEADERS_DIR}")

    if (NOT NODE_API_HEADERS_DIR)
      message(FATAL_ERROR "Failed to resolve `node-api-headers`")
      return()
    endif()

    # relocate...
    set(_NODE_API_INC_FILES "")
    file(GLOB_RECURSE _NODE_API_INC_FILES "${NODE_API_HEADERS_DIR}/*.h")
    file(COPY ${_NODE_API_INC_FILES} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/include/node-api-headers")
    unset(_NODE_API_INC_FILES)

    unset(NODE_API_HEADERS_DIR CACHE)
    # target include directories (as if 'node-api-headers' were an isolated CMake project...)
    set(NODE_API_HEADERS_DIR
      $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-api-headers>
      $<INSTALL_INTERFACE:include/node-api-headers>
    )
    set(NODE_API_HEADERS_DIR ${NODE_API_HEADERS_DIR} PARENT_SCOPE) # dont wrap this one in quotes; it breaks!

    # this is just for IDE support only, so globbing is safe
    set(NODE_API_INC_FILES "")
    file(GLOB_RECURSE NODE_API_INC_FILES "${NODE_API_HEADERS_DIR}/*.h")
    set(NODE_API_INC_FILES "${NODE_API_INC_FILES}" PARENT_SCOPE)
    source_group("Node API (C)" FILES "${NODE_API_INC_FILES}")

    if(VERBOSE)
        message(STATUS "NODE_API_HEADERS_DIR: ${NODE_API_HEADERS_DIR}")
    endif()

    set(NODE_API_HEADERS_DIR ${NODE_API_HEADERS_DIR} CACHE PATH "Node API Headers directory." FORCE)
    message(DEBUG "NODE_API_HEADERS_DIR: ${NODE_API_HEADERS_DIR}")
    unset(NODE_API_INC_FILES)
  endif()
  if(NOT DEFINED NODE_API_INC_FILES)
    file(GLOB_RECURSE NODE_API_INC_FILES "${NODE_API_HEADERS_DIR}/*.h")
    source_group("Node Addon API (C)" FILES ${NODE_API_INC_FILES}) # IDE only, don't pass this to target_sources()!
  endif()
  set(NODE_API_INC_FILES "${NODE_API_INC_FILES}" CACHE STRING "Node API Header files." FORCE)
endfunction()

#[=============================================================================[
Get NodeJS C++ Addon development files.

Provides
::
  NODE_ADDON_API_DIR, where to find napi.h, etc.
  NODE_ADDON_API_INC_FILES, the headers required to use Node Addon API.

]=============================================================================]#
function(cmakejs_acquire_node_api_cpp_headers)
  if(NOT DEFINED NODE_ADDON_API_DIR) # This matches the 'node-addon-api' package from vcpkg, so will avoid duplicates for those users
    execute_process(
      COMMAND "${NODE_EXECUTABLE}" -p "require('node-addon-api').include"
      WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
      OUTPUT_VARIABLE NODE_ADDON_API_DIR
      # COMMAND_ERROR_IS_FATAL ANY -these vars seem to error on ARM64 builds ...?
    )
    string(REGEX REPLACE "[\r\n\"]" "" NODE_ADDON_API_DIR "${NODE_ADDON_API_DIR}")
  
    if (NOT NODE_ADDON_API_DIR)
      message(FATAL_ERROR "Failed to resolve `node-addon-api`")
      return()
    endif()
    
    # relocate...
    set(_NODE_ADDON_API_INC_FILES "")
    file(GLOB_RECURSE _NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_DIR}/*.h")
    file(COPY ${_NODE_ADDON_API_INC_FILES} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/include/node-addon-api")
    unset(_NODE_ADDON_API_INC_FILES)

    unset(NODE_ADDON_API_DIR CACHE)
    # target include directories (as if 'node-addon-api' were an isolated CMake project...)
    set(NODE_ADDON_API_DIR
      $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-addon-api>
      $<INSTALL_INTERFACE:include/node-addon-api>
    )
    set(NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR} PARENT_SCOPE)

    # this is just for IDE support only, so globbing is safe
    set(NODE_ADDON_API_INC_FILES "")
    file(GLOB_RECURSE NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_DIR}/*.h")
    set(NODE_ADDON_API_INC_FILES ${NODE_ADDON_API_INC_FILES} PARENT_SCOPE)
    source_group("Node Addon API (C++)" FILES "${NODE_ADDON_API_INC_FILES}")

    if(VERBOSE)
        message(STATUS "NODE_ADDON_API_DIR: ${NODE_ADDON_API_DIR}")
    endif()
    
    set(NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR} CACHE PATH "Node Addon API Headers directory." FORCE)
    message(DEBUG "NODE_ADDON_API_DIR: ${NODE_ADDON_API_DIR}")
    unset(NODE_ADDON_API_INC_FILES)
  endif()
  if(NOT DEFINED NODE_ADDON_API_INC_FILES)
    file(GLOB_RECURSE NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_DIR}/*.h")
    source_group("Node Addon API (C++)" FILES "${NODE_ADDON_API_INC_FILES}") # just for IDE support; another misleading function name!
  endif()
  set(NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_INC_FILES}" CACHE STRING "Node Addon API Header files." FORCE)
endfunction()

#[=============================================================================[
Get NodeJS unstable development files.

Provides
::
  NODE_DEV_API_DIR, where to find node.h, etc.
  NODE_DEV_API_INC_FILES, the headers required to use Node unstable API.
  NODE_DEV_API_LIB_FILES, the .lib files required to use Node unstable API.

]=============================================================================]#
function(cmakejs_acquire_node_dev_headers)
  set(NODE_DEV_API_DIR "" CACHE STRING "Node Dev Headers directory.")

  if(NOT DEFINED NODE_DEV_API_DIR OR NODE_DEV_API_DIR STREQUAL "")
    message(FATAL_ERROR "NODE_DEV_API_DIR is not set. Please set it to the path of the NodeJS include directory.")
  endif()

  message (STATUS "Using Node dev headers from ${NODE_DEV_API_DIR}")

  execute_process(
    COMMAND "${NODE_EXECUTABLE}" "${CMAKEJS_HELPER_EXECUTABLE}" "cxx_standard" "${NODE_DEV_API_DIR}"
    WORKING_DIRECTORY ${_CMAKEJS_DIR}
    OUTPUT_VARIABLE CMAKEJS_CXX_STANDARD
    OUTPUT_STRIP_TRAILING_WHITESPACE
  )
  message (STATUS "Runtime headers require c++${CMAKEJS_CXX_STANDARD}")
  # override the cxx standard when needed
  if (DEFINED CMAKEJS_CXX_STANDARD)
    target_compile_features(cmake-js INTERFACE cxx_std_${CMAKEJS_CXX_STANDARD})
  endif()

  if(NOT DEFINED NODE_DEV_API_INC_FILES)
    file(GLOB_RECURSE NODE_DEV_API_INC_FILES "${NODE_DEV_API_DIR}/*.h")
    source_group("Node Addon API (C++)" FILES "${NODE_DEV_API_INC_FILES}") # just for IDE support; another misleading function name!
  endif()
  set(NODE_DEV_API_INC_FILES "${NODE_DEV_API_INC_FILES}" CACHE STRING "Node Addon API Header files." FORCE)

  if(NOT DEFINED NODE_DEV_API_LIB_FILES)
    file(GLOB_RECURSE NODE_DEV_API_LIB_FILES "${NODE_DEV_API_DIR}/*.lib")
  endif()
  set(NODE_DEV_API_LIB_FILES "${NODE_DEV_API_LIB_FILES}" CACHE STRING "Node Addon API Lib files." FORCE)
endfunction()

#[=============================================================================[
Get NodeJS NAN development files.

Provides
::
  NODE_NAN_API_DIR, where to find nan.h, etc.
  NODE_NAN_API_INC_FILES, the headers required to use NAN.

]=============================================================================]#
function(cmakejs_acquire_node_nan_headers)
  if(NOT DEFINED NODE_NAN_API_DIR) # This matches the 'node-nan-api' package from vcpkg, so will avoid duplicates for those users
    execute_process(
      COMMAND "${NODE_EXECUTABLE}" -e "require('nan')"
      WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
      OUTPUT_VARIABLE NODE_NAN_API_DIR
      # COMMAND_ERROR_IS_FATAL ANY -these vars seem to error on ARM64 builds ...?
    )
    string(REGEX REPLACE "[\r\n\"]" "" NODE_NAN_API_DIR "${NODE_NAN_API_DIR}")
  
    if (NOT NODE_NAN_API_DIR)
      message(FATAL_ERROR "Failed to resolve `nan`")
      return()
    endif()

    # relocate...
    set(_NODE_NAN_API_INC_FILES "")
    file(GLOB_RECURSE _NODE_NAN_API_INC_FILES "${NODE_NAN_API_DIR}/*.h")
    file(COPY ${_NODE_NAN_API_INC_FILES} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/include/node-nan")
    unset(_NODE_NAN_API_INC_FILES)

    unset(NODE_NAN_API_DIR CACHE)
    # target include directories (as if 'node-nan' were an isolated CMake project...)
    set(NODE_NAN_API_DIR
      $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-nan>
      $<INSTALL_INTERFACE:include/node-nan-api>
    )
    set(NODE_NAN_API_DIR ${NODE_NAN_API_DIR} PARENT_SCOPE)

    # this is just for IDE support only, so globbing is safe
    set(NODE_NAN_API_INC_FILES "")
    file(GLOB_RECURSE NODE_NAN_API_INC_FILES "${NODE_NAN_API_DIR}/*.h")
    set(NODE_NAN_API_INC_FILES ${NODE_NAN_API_INC_FILES} PARENT_SCOPE)
    source_group("Node Addon API (C++)" FILES "${NODE_NAN_API_INC_FILES}")

    if(VERBOSE)
        message(STATUS "NODE_NAN_API_DIR: ${NODE_NAN_API_DIR}")
    endif()
    
    set(NODE_NAN_API_DIR ${NODE_NAN_API_DIR} CACHE PATH "Node Addon API Headers directory." FORCE)
    message(DEBUG "NODE_NAN_API_DIR: ${NODE_NAN_API_DIR}")
    unset(NODE_NAN_API_INC_FILES)
  endif()
  if(NOT DEFINED NODE_NAN_API_INC_FILES)
    file(GLOB_RECURSE NODE_NAN_API_INC_FILES "${NODE_NAN_API_DIR}/*.h")
    source_group("Node Addon API (C++)" FILES "${NODE_NAN_API_INC_FILES}") # just for IDE support; another misleading function name!
  endif()
  set(NODE_NAN_API_INC_FILES "${NODE_NAN_API_INC_FILES}" CACHE STRING "Node Addon API Header files." FORCE)
endfunction()

#[=============================================================================[
Silently create an interface library (no output) with all Addon API dependencies
resolved, for each feature that we offer; this is for Addon targets to link with.

(This should contain most of cmake-js globally-required configuration)

Targets:

cmake-js::node-api
cmake-js::node-addon-api
cmake-js::cmake-js

]=============================================================================]#


function(cmakejs_setup_node_api_c_library)
  cmakejs_acquire_node_api_c_headers()

  # Check that this hasnt already been called
  if(TARGET cmake-js::node-api)
    return()
  endif()

  # Node API (C)
  # cmake-js::node-api
  add_library                 (node-api INTERFACE)
  add_library                 (cmake-js::node-api ALIAS node-api)
  target_include_directories  (node-api INTERFACE ${NODE_API_HEADERS_DIR}) # no string enclosure here!
  # set_target_properties       (node-api PROPERTIES VERSION   6.1.0)
  # set_target_properties       (node-api PROPERTIES SOVERSION 6)

  # find the node api definition to generate into node.lib
  if (MSVC) 
    execute_process(COMMAND ${NODE_EXECUTABLE} -p "require('node-api-headers').def_paths.node_api_def"
        WORKING_DIRECTORY ${_CMAKEJS_DIR}
        OUTPUT_VARIABLE CMAKEJS_NODELIB_DEF
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )

    if (NOT DEFINED CMAKEJS_NODELIB_DEF)
        message(FATAL_ERROR "Failed to find `node-api-headers` api definition")
        return()
    endif()

    set(CMAKEJS_NODELIB_TARGET "${CMAKE_BINARY_DIR}/node.lib")
    execute_process(COMMAND ${CMAKE_AR} /def:${CMAKEJS_NODELIB_DEF} /out:${CMAKEJS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
    target_link_libraries (node-api INTERFACE "${CMAKEJS_NODELIB_TARGET}")
    unset(CMAKEJS_NODELIB_DEF)
    unset(CMAKEJS_NODELIB_TARGET)
  endif()

  # This is rather manual, but ensures the list included is predictable and safe
  set(NODE_API_FILES "")
  list(APPEND NODE_API_FILES
    "node_api.h"
    "node_api_types.h"
    "js_native_api.h"
    "js_native_api_types.h"
  )

  foreach(FILE IN LISTS NODE_API_FILES)
    if(EXISTS "${CMAKE_CURRENT_BINARY_DIR}/include/node-api-headers/${FILE}")
      message(DEBUG "Found Node-API C header: ${FILE}")
      target_sources(node-api INTERFACE
        FILE_SET node_api_INTERFACE_HEADERS
        TYPE HEADERS
        BASE_DIRS
          $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
          $<INSTALL_INTERFACE:include>
        FILES
          $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-api-headers/${FILE}>
          $<INSTALL_INTERFACE:include/node-api-headers/${FILE}>
      )
    endif()
  endforeach()

  _cmakejs_export_target(node-api)

  # setup the install target
  install(FILES ${NODE_API_INC_FILES} DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-api-headers")
  install(TARGETS node-api
    EXPORT CMakeJSTargets
    LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
    INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-api-headers" # Having trouble setting this correctly
    PUBLIC_HEADER DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-api-headers" # this issue stems from their package.json, not our code... but guess who needs to fix it now :)
    FILE_SET node_api_INTERFACE_HEADERS
  )
endfunction()

function(cmakejs_setup_node_api_cpp_library)
  cmakejs_acquire_node_api_cpp_headers() # needs the c++ headers

  # Check that this hasnt already been called
  if(TARGET cmake-js::node-addon-api)
    return()
  endif()

  # Node Addon API (C++) - requires Node API (C) target, or node-dev
  # cmake-js::node-addon-api
  add_library                 (node-addon-api INTERFACE)
  add_library                 (cmake-js::node-addon-api ALIAS node-addon-api)
  target_include_directories  (node-addon-api INTERFACE ${NODE_ADDON_API_DIR})
  # target_link_libraries       (node-addon-api INTERFACE cmake-js::node-api)
  # set_target_properties       (node-addon-api PROPERTIES VERSION   1.1.0)
  # set_target_properties       (node-addon-api PROPERTIES SOVERSION 1)

  # This is rather manual, but ensures the list included is predictable and safe
  set(NODE_ADDON_API_FILES "")
  list(APPEND NODE_ADDON_API_FILES
    "napi-inl.deprecated.h"
    "napi-inl.h"
    "napi.h"
  )

  foreach(FILE IN LISTS NODE_ADDON_API_FILES)
    if(EXISTS "${CMAKE_CURRENT_BINARY_DIR}/include/node-addon-api/${FILE}")
      message(DEBUG "Found Node-API C++ header: ${FILE}")
      target_sources(node-addon-api INTERFACE
        FILE_SET node_addon_api_INTERFACE_HEADERS
        TYPE HEADERS
        BASE_DIRS
          $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
          $<INSTALL_INTERFACE:include>
        FILES
          $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-addon-api/${FILE}>
          $<INSTALL_INTERFACE:include/node-addon-api/${FILE}>
      )
    endif()
  endforeach()

  _cmakejs_export_target(node-addon-api)

  # setup the install target
  install(FILES ${NODE_ADDON_API_INC_FILES} DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-addon-api")
  install(TARGETS node-addon-api
    EXPORT CMakeJSTargets
    LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
    INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-addon-api"
    PUBLIC_HEADER DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-addon-api"
    FILE_SET node_addon_api_INTERFACE_HEADERS
  )
endfunction()

function(cmakejs_setup_node_dev_library)
  cmakejs_acquire_node_dev_headers() # needs the headers

  # Check that this hasnt already been called
  if(TARGET cmake-js::node-dev)
    return()
  endif()

  # Node NAN (C++) - requires node-dev
  # cmake-js::node-dev
  add_library                 (node-dev INTERFACE)
  add_library                 (cmake-js::node-dev ALIAS node-dev)
  
  if (EXISTS "${NODE_DEV_API_DIR}/include/node/node.h")
    # most runtime headers are in this directory
    target_include_directories  (node-dev INTERFACE "${NODE_DEV_API_DIR}/include/node")
  else()
    # some runtimes (or older versions) have the headers elsewhere
    target_include_directories  (node-dev INTERFACE 
      "${NODE_DEV_API_DIR}/src"
      "${NODE_DEV_API_DIR}/deps/v8/include"
      "${NODE_DEV_API_DIR}/deps/uv/include"
    )
  endif()
  # target_link_libraries       (node-dev INTERFACE cmake-js::node-api)
  # set_target_properties       (node-dev PROPERTIES VERSION   1.1.0)
  # set_target_properties       (node-dev PROPERTIES SOVERSION 1)

  if (MSVC)
    target_link_libraries (node-dev INTERFACE "${NODE_DEV_API_LIB_FILES}")
    target_compile_options (node-dev INTERFACE "/Zc:__cplusplus") # some headers check the value of this and need it to be accurate
  endif()

  foreach(FILE IN LISTS NODE_DEV_API_INC_FILES)
    if(EXISTS "${CMAKE_CURRENT_BINARY_DIR}/include/node-dev/${FILE}")
      message(DEBUG "Found NAN C++ header: ${FILE}")
      target_sources(node-dev INTERFACE
        FILE_SET node_dev_INTERFACE_HEADERS
        TYPE HEADERS
        BASE_DIRS
          $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
          $<INSTALL_INTERFACE:include>
        FILES
          $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-dev/${FILE}>
          $<INSTALL_INTERFACE:include/node-dev/${FILE}>
      )
    endif()
  endforeach()

  _cmakejs_export_target(node-dev)

  # setup the install target
  install(FILES ${NODE_DEV_API_INC_FILES} DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-dev")
  install(TARGETS node-dev
    EXPORT CMakeJSTargets
    LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
    INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-dev"
    PUBLIC_HEADER DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-dev"
    FILE_SET node_dev_INTERFACE_HEADERS
  )
endfunction()

function(cmakejs_setup_node_nan_library)
  cmakejs_acquire_node_nan_headers() # needs the headers

  # Check that this hasnt already been called
  if(TARGET cmake-js::node-nan)
    return()
  endif()

  # Node NAN (C++) - requires node-dev
  # cmake-js::node-nan
  add_library                 (node-nan INTERFACE)
  add_library                 (cmake-js::node-nan ALIAS node-nan)
  target_include_directories  (node-nan INTERFACE ${NODE_NAN_API_DIR})
  # target_link_libraries       (node-nan INTERFACE cmake-js::node-api)
  # set_target_properties       (node-nan PROPERTIES VERSION   1.1.0)
  # set_target_properties       (node-nan PROPERTIES SOVERSION 1)

  foreach(FILE IN LISTS NODE_NAN_API_INC_FILES)
    if(EXISTS "${CMAKE_CURRENT_BINARY_DIR}/include/node-nan/${FILE}")
      message(DEBUG "Found NAN C++ header: ${FILE}")
      target_sources(node-nan INTERFACE
        FILE_SET node_nan_INTERFACE_HEADERS
        TYPE HEADERS
        BASE_DIRS
          $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
          $<INSTALL_INTERFACE:include>
        FILES
          $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-nan/${FILE}>
          $<INSTALL_INTERFACE:include/node-nan/${FILE}>
      )
    endif()
  endforeach()

  _cmakejs_export_target(node-nan)

  # setup the install target
  install(FILES ${NODE_NAN_API_INC_FILES} DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-nan")
  install(TARGETS node-nan
    EXPORT CMakeJSTargets
    LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
    INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-nan"
    PUBLIC_HEADER DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node-nan"
    FILE_SET node_nan_INTERFACE_HEADERS
  )
endfunction()

# CMakeJS API - Helpers to ensure delay hook and other build properties are setup
# cmake-js::cmake-js
add_library                 (cmake-js INTERFACE)
add_library                 (cmake-js::cmake-js ALIAS cmake-js)
target_compile_definitions  (cmake-js INTERFACE "BUILDING_NODE_EXTENSION")
target_compile_features     (cmake-js INTERFACE cxx_std_14)

# set_target_properties       (cmake-js PROPERTIES VERSION   ${_CMAKEJS_VERSION})
# set_target_properties       (cmake-js PROPERTIES SOVERSION 7)
set_target_properties       (cmake-js PROPERTIES COMPATIBLE_INTERFACE_STRING CMakeJS_MAJOR_VERSION)

if (MSVC) 
  target_sources (cmake-js INTERFACE "${_CMAKEJS_DIR}/lib/cpp/win_delay_load_hook.cc")

  # setup delayload
  target_link_options(cmake-js INTERFACE "/DELAYLOAD:NODE.EXE")
  target_link_libraries(cmake-js INTERFACE delayimp)

  if (CMAKE_SYSTEM_PROCESSOR MATCHES "(x86)|(X86)" OR CMAKE_GENERATOR_PLATFORM STREQUAL "Win32")
      target_link_options(cmake-js INTERFACE "/SAFESEH:NO")
  endif()
endif()


if (APPLE)
  # TODO: Does macos need the following still?
  target_compile_options(cmake-js INTERFACE "-D_DARWIN_USE_64_BIT_INODE=1")
  target_compile_options(cmake-js INTERFACE "-D_LARGEFILE_SOURCE")
  target_compile_options(cmake-js INTERFACE "-D_FILE_OFFSET_BITS=64")
  target_link_options(cmake-js INTERFACE -undefined dynamic_lookup)
endif()

function(_cmakejs_export_target name)
  export (
    TARGETS ${name}
    APPEND FILE share/cmake/CMakeJSTargets.cmake
    NAMESPACE cmake-js::
  )

  # This should enable each target to behave well with intellisense
  target_include_directories(${name}
    INTERFACE
    $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
    $<INSTALL_INTERFACE:include>
  )
endfunction()
export (
  TARGETS 
  FILE share/cmake/CMakeJSTargets.cmake
  NAMESPACE cmake-js::
)
_cmakejs_export_target(cmake-js)


set(_cmakejs_node_api_cpp_missing_logged FALSE)

#[=============================================================================[
A helper function for creating a dynamic '*.node' library, linked to the Addon API interface.

cmakejs_create_node_api_addon(<name> [<sources>])
cmakejs_create_node_api_addon(<name> [ALIAS <alias>] [NAMESPACE <namespace>] [NAPI_VERSION <version>] [<sources>])

]=============================================================================]#
function(cmakejs_create_node_api_addon name)
  cmakejs_setup_node_api_c_library() # needs c addons support

    # Avoid duplicate target names
    if(TARGET ${name})
        message(SEND_ERROR "'cmakejs_create_node_api_addon()' given target '${name}' which is already exists. Please choose a unique name for this Addon target.")
        return()
    endif()

    set(options)
    set(args ALIAS NAMESPACE NAPI_VERSION EXCEPTIONS)
    set(list_args)
    cmake_parse_arguments(ARG "${options}" "${args}" "${list_args}" "${ARGN}")

    # Generate the identifier for the resource library's namespace
    set(ns_re "^[a-zA-Z_][a-zA-Z0-9_]*$")

    if(NOT DEFINED ARG_NAMESPACE)
        # Check that the library name is also a valid namespace
        if(NOT name MATCHES "${ns_re}")
            message(SEND_ERROR "Library name is not a valid namespace. Specify the NAMESPACE argument")
            return()
        endif()
        set(ARG_NAMESPACE "${name}")
    else()
        if(NOT ARG_NAMESPACE MATCHES "${ns_re}")
            message(SEND_ERROR "NAMESPACE for ${name} is not a valid C++ namespace identifier (${ARG_NAMESPACE})")
            return()
        endif()
    endif()

    # TODO: This needs more/better validation...
    if(DEFINED ARG_NAPI_VERSION AND (ARG_NAPI_VERSION LESS_EQUAL 0))
        message(SEND_ERROR "NAPI_VERSION for ${name} is not a valid Integer number (${ARG_NAPI_VERSION})")
        return()
    endif()

    if(NOT DEFINED ARG_NAPI_VERSION)
        if(NOT DEFINED NAPI_VERSION)
            # default NAPI version to use if none specified
            set(NAPI_VERSION 8)
        endif()
        set(ARG_NAPI_VERSION ${NAPI_VERSION})
    endif()

    if(ARG_ALIAS)
        set(name_alt "${ARG_ALIAS}")
    else()
        set(name_alt "${ARG_NAMESPACE}")
    endif()

    # How the exceptions are set in fallback cases can be very tricky
    # to ascertain. There are numerous different '-D' flags for different
    # compilers and platforms for either enabling or disabling exceptions;
    # It is also not a good idea to use mixed exceptions policies, or
    # link different libraries together with different exceptions policies;
    # The user could call this nice new EXCEPTIONS arg in our function, which
    # sets a PUBLIC definition (meaning, it propagates to anything that might
    # be linked with it); our arg accepts YES, NO, or MAYBE as per <napi.h>.
    # Default is MAYBE (as in, no opinion of our own...)
    # But, this is not taking into account the users that would rather set
    # '-D_UNWIND', '-DCPP_EXCEPTIONS', or some other flag specific to their
    # system. If they did, and we are not honouring it, then we are risking
    # breaking their global exceptions policy...
    # For this reason, the user can also also set a CUSTOM flag, which will 
    # disable this logic, and require the user to set their own flags.
    if(NOT ARG_EXCEPTIONS)
      set(ARG_EXCEPTIONS "MAYBE") # YES, NO, MAYBE, or CUSTOM...
    endif()

    if((NOT DEFINED NAPI_CPP_EXCEPTIONS) OR
        (NOT DEFINED NAPI_DISABLE_CPP_EXCEPTIONS) OR
        (NOT DEFINED NAPI_CPP_EXCEPTIONS_MAYBE)
      )

      if(ARG_EXCEPTIONS STREQUAL "YES")
        set(_NAPI_GLOBAL_EXCEPTIONS_POLICY "NAPI_CPP_EXCEPTIONS")
      elseif(ARG_EXCEPTIONS STREQUAL "NO")
        set(_NAPI_GLOBAL_EXCEPTIONS_POLICY "NAPI_DISABLE_CPP_EXCEPTIONS")
      elseif(ARG_EXCEPTIONS STREQUAL "MAYBE")
        set(_NAPI_GLOBAL_EXCEPTIONS_POLICY "NAPI_CPP_EXCEPTIONS_MAYBE")
      endif()

    endif()

    if(VERBOSE)
        message(STATUS "Configuring NodeJS Addon: ${name}")
    endif()

    # Begin a new NodeJS Addon target

    add_library(${name} SHARED)
    add_library(${name_alt}::${name} ALIAS ${name})

    # Always link the basic needed libraries
    target_link_libraries(${name} PRIVATE cmake-js::cmake-js cmake-js::node-api)
    # link the c++ library if it has been defined
    if(TARGET cmake-js::node-addon-api)
      target_link_libraries(${name} PRIVATE cmake-js::node-addon-api)
    elseif(NOT _cmakejs_node_api_cpp_missing_logged)
      message(STATUS "Node Addon API (C++) library not loaded. Skipping...")
      set(_cmakejs_node_api_cpp_missing_logged TRUE)
    endif()

    set_property(
      TARGET ${name}
      PROPERTY "${name}_IS_NODE_API_ADDON_LIBRARY" TRUE # Custom property
    )


    set_target_properties(${name}
      PROPERTIES

      LIBRARY_OUTPUT_NAME "${name}"
      PREFIX ""
      SUFFIX ".node"

      ARCHIVE_OUTPUT_DIRECTORY "${CMAKEJS_BINARY_DIR}/lib" # Actually we might not need to enforce an opinion here!
      LIBRARY_OUTPUT_DIRECTORY "${CMAKEJS_BINARY_DIR}" # Instead, we call 'cmakejs_create_addon_bindings()'
      RUNTIME_OUTPUT_DIRECTORY "${CMAKEJS_BINARY_DIR}/bin" # on this target, and the user can just 'require()' that file!

      # # Conventional C++-style debug settings might be useful to have...
      # Getting Javascript bindings to grep different paths is tricky, though!
      # LIBRARY_OUTPUT_NAME_DEBUG "d${name}"
      # ARCHIVE_OUTPUT_DIRECTORY_DEBUG "${CMAKEJS_BINARY_DIR}/lib/Debug"
      # LIBRARY_OUTPUT_DIRECTORY_DEBUG "${CMAKEJS_BINARY_DIR}/lib/Debug"
      # RUNTIME_OUTPUT_DIRECTORY_DEBUG "${CMAKEJS_BINARY_DIR}/bin/Debug"
    )

    cmakejs_nodejs_addon_add_sources(${name} ${ARG_UNPARSED_ARGUMENTS})

    cmakejs_nodejs_addon_add_definitions(${name}
      PRIVATE # These definitions only belong to this unique target
      "CMAKEJS_ADDON_NAME=${name}"
      "CMAKEJS_ADDON_ALIAS=${name_alt}"
      "NAPI_CPP_CUSTOM_NAMESPACE=${ARG_NAMESPACE}"
    )

    cmakejs_nodejs_addon_add_definitions(${name}
      PUBLIC # These definitions are shared with anything that links to this addon
      "NAPI_VERSION=${ARG_NAPI_VERSION}"
      "BUILDING_NODE_EXTENSION"
      "${_NAPI_GLOBAL_EXCEPTIONS_POLICY}"
    )

    # Global exceptions policy
    unset(_NAPI_GLOBAL_EXCEPTIONS_POLICY)

endfunction()

#[=============================================================================[
Add source files to an existing Nodejs Addon target.

cmakejs_nodejs_addon_add_sources(<name> [items1...])
cmakejs_nodejs_addon_add_sources(<name> [BASE_DIRS <dirs>] [items1...])
cmakejs_nodejs_addon_add_sources(<name> [<INTERFACE|PUBLIC|PRIVATE> [items1...] [<INTERFACE|PUBLIC|PRIVATE> [items2...] ...]])
cmakejs_nodejs_addon_add_sources(<name> [<INTERFACE|PUBLIC|PRIVATE> [BASE_DIRS [<dirs>...]] [items1...]...)
]=============================================================================]#
function(cmakejs_nodejs_addon_add_sources name)

    # Check that this is a Node Addon target
    get_target_property(is_addon_lib ${name} ${name}_IS_NODE_API_ADDON_LIBRARY)
    if(NOT TARGET ${name} OR NOT is_addon_lib)
        message(SEND_ERROR "'cmakejs_nodejs_addon_add_sources()' called on '${name}' which is not an existing nodejs addon library")
        return()
    endif()

    set(options)
    set(args BASE_DIRS)
    set(list_args INTERFACE PRIVATE PUBLIC)
    cmake_parse_arguments(ARG "${options}" "${args}" "${list_args}" "${ARGN}")

    if(NOT ARG_BASE_DIRS)
        # Default base directory of the passed-in source file(s)
        set(ARG_BASE_DIRS "${CMAKE_CURRENT_SOURCE_DIR}")
    endif()
    _cmakejs_normalize_path(ARG_BASE_DIRS)
    get_filename_component(ARG_BASE_DIRS "${ARG_BASE_DIRS}" ABSOLUTE)

    # All remaining unparsed args 'should' be source files for this target, so...
    foreach(input IN LISTS ARG_UNPARSED_ARGUMENTS)

        _cmakejs_normalize_path(input)
        get_filename_component(abs_in "${input}" ABSOLUTE)
        file(RELATIVE_PATH relpath "${ARG_BASE_DIRS}" "${abs_in}")
        if(relpath MATCHES "^\\.\\.")
            # For now we just error on files that exist outside of the source dir.
            message(SEND_ERROR "Cannot add file '${input}': File must be in a subdirectory of ${ARG_BASE_DIRS}")
            return()
        endif()

        set(rel_file "${ARG_BASE_DIRS}/${relpath}")
        _cmakejs_normalize_path(rel_file)
        get_filename_component(source_file "${input}" ABSOLUTE)
        # If we are here, source file is valid. Add IDE support
        source_group("${name}" FILES "${source_file}")

        if(DEFINED ARG_INTERFACE)
            foreach(item IN LISTS ARG_INTERFACE)
                target_sources(${name} INTERFACE "${source_file}")
            endforeach()
        endif()

        if(DEFINED ARG_PRIVATE)
            foreach(item IN LISTS ARG_PRIVATE)
                target_sources(${name} PRIVATE "${source_file}")
            endforeach()
        endif()

        if(DEFINED ARG_PUBLIC)
            foreach(item IN LISTS ARG_PUBLIC)
                target_sources(${name} PUBLIC "${source_file}")
            endforeach()
        endif()

        foreach(input IN LISTS ARG_UNPARSED_ARGUMENTS)
            target_sources(${name} PRIVATE "${source_file}")
        endforeach()

    endforeach()

endfunction()

#[=============================================================================[
Add pre-processor definitions to an existing NodeJS Addon target.

cmakejs_nodejs_addon_add_definitions(<name> [items1...])
cmakejs_nodejs_addon_add_definitions(<name> <INTERFACE|PUBLIC|PRIVATE> [items1...] [<INTERFACE|PUBLIC|PRIVATE> [items2...] ...])
]=============================================================================]#
function(cmakejs_nodejs_addon_add_definitions name)

    # Check that this is a Node Addon target
    get_target_property(is_addon_lib ${name} ${name}_IS_NODE_API_ADDON_LIBRARY)
    if(NOT TARGET ${name} OR NOT is_addon_lib)
        message(SEND_ERROR "'cmakejs_nodejs_addon_add_definitions()' called on '${name}' which is not an existing nodejs addon library")
        return()
    endif()

    set(options)
    set(args)
    set(list_args INTERFACE PRIVATE PUBLIC)
    cmake_parse_arguments(ARG "${options}" "${args}" "${list_args}" "${ARGN}")

    if(DEFINED ARG_INTERFACE)
        foreach(item IN LISTS ARG_INTERFACE)
            target_compile_definitions(${name} INTERFACE "${item}")
        endforeach()
    endif()

    if(DEFINED ARG_PRIVATE)
        foreach(item IN LISTS ARG_PRIVATE)
            target_compile_definitions(${name} PRIVATE "${item}")
        endforeach()
    endif()

    if(DEFINED ARG_PUBLIC)
        foreach(item IN LISTS ARG_PUBLIC)
            target_compile_definitions(${name} PUBLIC "${item}")
        endforeach()
    endif()

    foreach(input IN LISTS ARG_UNPARSED_ARGUMENTS)
        target_compile_definitions(${name} "${item}")
    endforeach()

endfunction()

#[=============================================================================[
Collect targets and allow CMake to provide them

Julian: I have no idea what any of this means, or why anyone would want to do 
        it with a nodejs addon.
        For me, the value in cmake-js is in building the `.node` addon files, 
        which need to be in paths that nodejs understands, so why do we care 
        about cmake and its CMAKE_BINARY_DIR?
        Anyway, this was contributed, and I feel bad ripping it out without 
        more of a reason.

Builders working with CMake at any level know how fussy CMake is about stuff
like filepaths, and how to resolve your project's dependencies. Enough people
went "agh if CMake is gonna be so fussy about my project's filepaths, why can't
it just look after that stuff by itself? Why have I got to do this?" and CMake
went "ok then, do these new 'export()' and 'install()' functions and I'll sort it
all out myself, for you. I'll also sort it out for your users, and their users too!"

DISCLAIMER: the names 'export()' and 'install()' are just old CMake parlance -
very misleading, at first - try to not think about 'installing' in the traditional
system-level sense, nobody does that until much later downstream from here...

Earlier, we scooped up all the different header files, logically arranged them into
seperate 'targets' (with a little bit of inter-dependency management), and copied
them into the binary dir. In doing so, we effectively 'chopped off' their
absolute paths; they now 'exist' (temporarily) on a path that *we have not
defined yet*, which is CMAKE_BINARY_DIR.

In using the BUILD_ and INSTALL_ interfaces, we told CMake how to relocate those
files as it pleases. CMake will move them around as it pleases, but no matter
where those files end up, they will *always* be at 'CMAKE_BINARY_DIR/include/dir',
as far as CMake cares; it will put those files anywhere it needs to, at any time,
*but* we (and our consumers' CMake) can depend on *always* finding them at
'CMAKE_BINARY_DIR/include/dir', no matter what anybody sets their CMAKE_BINARY_DIR
to be.
]=============================================================================]#


# include (CMakePackageConfigHelpers)
# file (WRITE "${CMAKE_CURRENT_BINARY_DIR}/CMakeJSConfig.cmake.in" [==[
# @PACKAGE_INIT@

# include (${CMAKE_CURRENT_LIST_DIR}/CMakeJSTargets.cmake)

# check_required_components (cmake-js)

# list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/cmake-js/share/cmake")

# # Tell the user what to do
# message(STATUS "-- Appended cmake-js CMake API to your module path.")
# message(STATUS "-- You may 'include(CMakeJS)' in your CMake project to use our API and/or relocatable targets.")
# message(STATUS "-- Read more about our 'CMakeJS.cmake' API here:")
# message(STATUS "-- https://github.com/cmake-js/cmake-js/blob/master/README.md")
# ]==])

# # create cmake config file
# configure_package_config_file (
#     "${CMAKE_CURRENT_BINARY_DIR}/CMakeJSConfig.cmake.in"
#     "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/CMakeJSConfig.cmake"
#   INSTALL_DESTINATION
#     "${CMAKE_INSTALL_LIBDIR}/cmake/CMakeJS"
# )
# # generate the version file for the cmake config file
# write_basic_package_version_file (
# 	"${CMAKE_CURRENT_BINARY_DIR}/share/cmake/CMakeJSConfigVersion.cmake"
# 	VERSION ${_version}
# 	COMPATIBILITY AnyNewerVersion
# )
# # pass our module along
# file(COPY "${_CMAKEJS_SCRIPT}" DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/share/cmake")

# # These install blocks are predicated on the idea that our consumers want to control certain vars themselves:
# #
# # - CMAKE_BINARY_DIR - where they want CMake's 'configure/build' output to go
# # - CMAKE_INSTALL_PREFIX - where they want CMake's 'install' output to go
# #
# # Our users should be free to specify things like the above as they wish; we can't possibly
# # know in advance, and we don't want to be opinionated...
# #
# # It's not just users who will set CMAKE_INSTALL_* though; it's vcpkg and other package
# # managers and installers too! (see CPack)

# unset(CMAKEJS_INC_DIR)
# set(CMAKEJS_INC_DIR
#   $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
#   $<INSTALL_INTERFACE:include>
#   CACHE PATH "Installation directory for include files, a relative path that will be joined with ${CMAKE_INSTALL_PREFIX} or an absolute path."
#   FORCE
# )

# # # copy headers (and definitions?) to build dir for distribution
# # if(CMAKEJS_USING_NODE_DEV)
# #   install(FILES ${CMAKE_JS_INC_FILES} DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node")
# #   install(TARGETS node-dev
# #     EXPORT CMakeJSTargets
# #     LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
# #     ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
# #     RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
# #     INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
# #     FILE_SET node_dev_INTERFACE_HEADERS
# #   )
# # endif()

# install(FILES ${_CMAKEJS_SCRIPT} DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/CMakeJS")
# install(TARGETS cmake-js
#   EXPORT CMakeJSTargets
#   LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
#   ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
#   RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
#   INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
# )

# # install config files
# install(FILES
#   "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/CMakeJSConfig.cmake"
#   "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/CMakeJSConfigVersion.cmake"
#   DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/CMakeJS"
# )

# # install 'CMakeJSTargets' export file
# install(
#   EXPORT CMakeJSTargets
#   FILE CMakeJSTargets.cmake
#   NAMESPACE cmake-js::
#   DESTINATION lib/cmake/CMakeJS
# )

unset(_version)
