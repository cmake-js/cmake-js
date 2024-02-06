#[=============================================================================[
  CMakeJS.cmake - A proposed CMake API for cmake-js v8
  Copyright (C) 2024 Nathan J. Hood
  MIT License
  See: https://github.com/nathanjhood/NapiAddon
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
Internal helper (borrowed from CMakeRC).
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
  COMMAND "${CMAKEJS_HELPER_EXECUTABLE}" "version"
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

message (STATUS "\n-- Using cmake-js v${_CMAKEJS_VERSION}")

if(MSVC)
  set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>" CACHE STRING "Select the MSVC runtime library for use by compilers targeting the MSVC ABI." FORCE)
endif()

# #[=============================================================================[
# Provides CMAKE_JS_EXECUTABLE
# ]=============================================================================]#
# function(cmakejs_find_cmakejs_executable)
#   # Check for cmake-js installations
#   find_program(CMAKE_JS_EXECUTABLE
#     NAMES "cmake-js" "cmake-js.exe"
#     PATHS "$ENV{PATH}" "$ENV{ProgramFiles}/cmake-js"
#     DOC "cmake-js system executable binary"
#     REQUIRED
#   )
#   if(NOT CMAKE_JS_EXECUTABLE)
#     find_program(CMAKE_JS_EXECUTABLE
#       NAMES "cmake-js" "cmake-js.exe"
#       PATHS "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/cmake-js/bin"
#       DOC "cmake-js project-local npm package binary"
#       REQUIRED
#     )
#     if (NOT CMAKE_JS_EXECUTABLE)
#         message(FATAL_ERROR "cmake-js not found! Please run 'npm install' and try again.")
#         return()
#     endif()
#   endif()
#   _cmakejs_normalize_path(CMAKE_JS_EXECUTABLE)
#   string(REGEX REPLACE "[\r\n\"]" "" CMAKE_JS_EXECUTABLE "${CMAKE_JS_EXECUTABLE}")
#   set(CMAKE_JS_EXECUTABLE ${CMAKE_JS_EXECUTABLE} PARENT_SCOPE) # vars defined in functions only apply to their own scope, so this is needed!
# endfunction()

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

#[=============================================================================[
Get NodeJS C Addon development files.

Provides
::

  NODE_API_HEADERS_DIR, where to find node_api.h, etc.
  NODE_API_INC_FILES, the headers required to use Node API.

]=============================================================================]#
function(cmakejs_acquire_node_api_c_headers)
 # Acquire if needed...
  if(NOT DEFINED NODE_API_HEADERS_DIR) # Why the NODE_API_* namespace? Because 'node-api-headers' from vcpkg also provides this exact var, so we can help our users from vcpkg-land avoid picking up headers they already have ; but, we still need to process those headers into our target(s) for them!
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
Generate a Javascript bindings file to your built addon, at the root of your
build directory, providing a more predictable file to acquire your built addon
from instead of having to work out where your built addon went from the Javascript
side.

(experimental)
]=============================================================================]#
function(cmakejs_create_addon_bindings addon_target) # TODO - is this useful? it feels kinda useful, but not if distributing with prebuilds (unless the prebuild system understands this)

  # Check that this is a Node Addon target
  get_target_property(is_addon_lib ${name} ${name}_IS_NODE_API_ADDON_LIBRARY)
  if(NOT TARGET ${name} OR NOT is_addon_lib)
    message(SEND_ERROR "'cmakejs_create_addon_bindings()' called on '${name}' which is not an existing nodejs addon library")
    return()
  endif()

  # Figure out the path from the build dir to wherever the built addon went
  file(RELATIVE_PATH _bindings_rel_path "${CMAKE_CURRENT_BINARY_DIR}" "${CMAKE_LIBRARY_OUTPUT_DIRECTORY}")

  # Use the addon name and relative path to create a 'configured' string (vars surrounded with @'s get evaluated)
  string(CONFIGURE [[
const @addon_target@ = require(`./@_bindings_rel_path@/@addon_target@.node`);
module.exports = @addon_target@;
]]
    _bindings
    @ONLY
  )

  # write the configured string to a file in the binary dir, providing a
  # consistent binding point for every addon built! :)
  file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/${addon_target}.node.js" "${_bindings}")

  # Now, built addons can be found easier in Javascript:
  # const my_addon = require('./build/<addon_name>')

  # If your CMake is not going into './build' then obvuously it should be
  # changed; but, we should *never* write CMake-configured bindings file
  # into anybody's source tree, as we might corrupt their work! ALWAYS
  # put this kind of stuff into the binary dir!
  message(STATUS "-- Created Javascript bindings: ${addon_target}.node.js")
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

if(NOT DEFINED NODE_EXECUTABLE)
  cmakejs_acquire_node_executable()
  message(DEBUG "NODE_EXECUTABLE: ${NODE_EXECUTABLE}")
  message(DEBUG "NODE_VERSION: ${NODE_VERSION}")
endif()

# if(CMAKEJS_USING_NODE_DEV) # user did 'cmake-js configure --link-level=0' or higher
#   # NodeJS system installation headers
#   # cmake-js::node-dev
#   add_library                 (node-dev INTERFACE)
#   add_library                 (cmake-js::node-dev ALIAS node-dev)
#   target_sources              (node-dev INTERFACE ${CMAKE_JS_SRC}) # tip: don't enclose this in strings! (or it won't be null if the file is nonexistent)
#   target_link_libraries       (node-dev INTERFACE ${CMAKE_JS_LIB}) # tip: don't enclose this in strings! (or it won't be null if the file is nonexistent)
#   set_target_properties       (node-dev PROPERTIES VERSION ${NODE_VERSION})
#   target_include_directories  (node-dev INTERFACE
#     $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node>
#     $<INSTALL_INTERFACE:include/node>
#   )

#   # TODO: this list would be un-manageable for all iterations of NodeJS dev files
#   # across versions; even minor versions seem to have lots of different files!
#   # Fortunately for us, HEADERS should never really go to 'target_sources',
#   # because HEADERS are *not supposed to be compiled*, they are only used
#   # for lookup by the compiler. They are just symbolic, nothing more.
#   #
#   # The two 'correct' mechanisms for adding headers to a target in CMake are:
#   #
#   # Modern CMake: you can put them in 'target_sources()' - one by one, never
#   # by globbing expressions! - if you create a FILE_SET of TYPE HEADERS
#   # and follow the strict naming conventions and BASE_DIRS thing.
#   #
#   # Classic CMake: You don't actually pass any header files to your target
#   # explicitly; instead, you just put their path on 'target_include_directories()',
#   # and your compiler/CMake/IDE/intellisense will loop up the file relative to
#   # that path. So you can then '#include <from/that/path.h>'
#   #
#   # This manual listing of files maybe wouldnt be so bad if we just globbed
#   # everything recursively and dumped them all into one massive dir. But (aHa!),
#   # they have all been authored to '#include <very/specific/paths.h>', and for
#   # very good reason - these libnode-dev headers contain familiar libs such as
#   # openssl, but these ones are doctored by team NodeJS according to their custom
#   # needs, and that's why NodeJS ships these third-party copies under their own
#   # include line.
#   #
#   # We can glob the files; we can even have CMake just pick up the base dir and
#   # throw that around; but, we'd have to generate the entire FILESET below with
#   # a fully-maintained filetree and include line, specific to whichever version
#   # of NodeJS that cmake.js has picked up for us.
#   #
#   # So instead of taking on unthinkable complexity of maintaining this, we can
#   # just pass the relocatable '*_INCLUDE_DIR' from under these copied files that
#   # CMake is already passing around, and just pass that to our target's
#   # 'target_include_directories()' and let it do the 'Classical lookup-only header'
#   # approach. We lose nothing, really, since none of these files are supposed to be
#   # compiled in. CMake only ever just needed to know where the base dir is that
#   # it can instruct the compiler and linker do their symbol lookups from, and
#   # the dir we're passing in has been made CMake-relocatable thanks to it's
#   # BUILD_ and INSTALL_ interfaces and generator expressions. That is really
#   # the definition of an INTERFACE library in CMake parlance anyway - a CMake
#   # - formatted header-only library :)


#   # set(NODE_DEV_FILES "")
#   # list(APPEND NODE_DEV_FILES
#   #   # NodeJS core
#   #   "node_buffer.h"
#   #   "node_object_wrap.h"
#   #   "node_version.h"
#   #   "node.h"
#   #   # NodeJS addon
#   #   "node_api.h"
#   #   "node_api_types.h"
#   #   "js_native_api.h"
#   #   "js_native_api_types.h"
#   #   # uv
#   #   "uv.h"
#   #   # v8
#   #   "v8config.h"
#   #   "v8-array-buffer.h"
#   #   "v8-callbacks.h"
#   #   "v8-container.h"
#   #   "v8-context.h"
#   #   "v8-data.h"
#   #   "v8-date.h"
#   #   "v8-debug.h"
#   #   "v8-embedder-heap.h"
#   #   "v8-embedder-state-scope.h"
#   #   "v8-exception.h"
#   #   "v8-extension.h"
#   #   "v8-forward.h"
#   #   "v8-function-callback.h"
#   #   "v8-function.h"
#   #   "v8-initialization.h"
#   #   "v8-internal.h"
#   #   "v8-isolate.h"
#   #   "v8-json.h"
#   #   "v8-local-handle.h"
#   #   "v8-locker.h"
#   #   "v8-maybe.h"
#   #   "v8-memory-span.h"
#   #   "v8-message.h"
#   #   "v8-microtask-queue.h"
#   #   "v8-microtask.h"
#   #   "v8-object.h"
#   #   "v8-persistent-handle.h"
#   #   "v8-platform.h"
#   #   "v8-primitive-object.h"
#   #   "v8-primitive.h"
#   #   "v8-profiler.h"
#   #   "v8-promise.h"
#   #   "v8-proxy.h"
#   #   "v8-regexp.h"
#   #   "v8-script.h"
#   #   "v8-snapshot.h"
#   #   "v8-statistics.h"
#   #   "v8-template.h"
#   #   "v8-traced-handle.h"
#   #   "v8-typed-array.h"
#   #   "v8-unwinder.h"
#   #   "v8-util.h"
#   #   "v8-value-serializer-version.h"
#   #   "v8-value-serializer.h"
#   #   "v8-value.h"
#   #   "v8-version.h"
#   #   "v8-version-string.h"
#   #   "v8-wasm.h"
#   #   "v8-wasm-trap-handler-posix.h"
#   #   "v8-wasm-trap-handler-win.h"
#   #   "v8-weak-callback.h"
#   #   "v8.h"
#   #   "v8-config.h"
#   #   # zlib
#   #   "zconf.h"
#   #   "zlib.h"
#   # )

#   # foreach(FILE IN LISTS NODE_DEV_FILES)
#   #   if(EXISTS "${CMAKE_CURRENT_BINARY_DIR}/include/node/${FILE}")
#   #     message(DEBUG "Found NodeJS developer header: ${FILE}")
#   #     target_sources(node-dev INTERFACE
#   #     FILE_SET node_dev_INTERFACE_HEADERS
#   #     TYPE HEADERS
#   #     BASE_DIRS
#   #       $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
#   #       $<INSTALL_INTERFACE:include>
#   #     FILES
#   #       $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node/${FILE}>
#   #       $<INSTALL_INTERFACE:include/node/${FILE}>
#   #   )
#   #   endif()
#   # endforeach()
#   set(_CMAKE_JS_INC_FILES "")

#   # Not quite working, but not breaking anything...
#   foreach(input IN ITEMS "${CMAKE_JS_INC}")

#       _cmakejs_normalize_path(input)
#       get_filename_component(file_abs_path  "${input}" ABSOLUTE)
#       get_filename_component(file_name      "${input}" NAME)
#       file(RELATIVE_PATH file_rel_path "${CMAKE_CURRENT_BINARY_DIR}" "${file_abs_path}") # /${file_name}

#       message(DEBUG "Found NodeJS development header: ${file_name}")
#       message(DEBUG "file_abs_path: ${file_abs_path}")
#       message(DEBUG "file_rel_path: ${file_rel_path}")
#       target_sources(node-dev INTERFACE
#         FILE_SET node_dev_INTERFACE_HEADERS
#         TYPE HEADERS
#         BASE_DIRS
#           $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include> # /node
#           $<INSTALL_INTERFACE:include> # /node
#         FILES
#           $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/${file_rel_path}> # /${file_name}
#           $<INSTALL_INTERFACE:${file_rel_path}>
#       )

#   endforeach()
#   unset(_CMAKE_JS_INC_FILES)

#   _cmakejs_export_target(node-dev)
# endif()

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
  set_target_properties       (node-api PROPERTIES VERSION   6.1.0)
  set_target_properties       (node-api PROPERTIES SOVERSION 6)

  # find the node api definition to generate into node.lib
  if (MSVC) 
    target_sources (node-api INTERFACE "${_CMAKEJS_DIR}/lib/cpp/win_delay_load_hook.cc")

    execute_process(COMMAND ${NODE_PATH} -p "require('node-api-headers').def_paths.node_api_def"
        WORKING_DIRECTORY ${_CMAKEJS_DIR}
        OUTPUT_VARIABLE CMAKEJS_NODELIB_DEF
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )

    if (DEFINED CMAKEJS_NODELIB_DEF)
        message(FATAL_ERROR "Failed to find `node-api-headers` api definition")
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
  set_target_properties       (node-addon-api PROPERTIES VERSION   1.1.0)
  set_target_properties       (node-addon-api PROPERTIES SOVERSION 1)

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

# CMakeJS API - Helpers to ensure delay hook and other build properties are setup
# cmake-js::cmake-js
add_library                 (cmake-js INTERFACE)
add_library                 (cmake-js::cmake-js ALIAS cmake-js)
target_compile_definitions  (cmake-js INTERFACE "BUILDING_NODE_EXTENSION")
target_compile_features     (cmake-js INTERFACE cxx_nullptr) # Signal a basic C++11 feature to require C++11.
set_target_properties       (cmake-js PROPERTIES VERSION   ${_CMAKEJS_VERSION})
set_target_properties       (cmake-js PROPERTIES SOVERSION 7)
set_target_properties       (cmake-js PROPERTIES COMPATIBLE_INTERFACE_STRING CMakeJS_MAJOR_VERSION)

function(_cmakejs_export_target name)
  export (
    TARGETS ${name}
    APPEND FILE share/cmake/CMakeJSTargets.cmake
    NAMESPACE cmake-js::
  )

  # This should enable each target to behave well with intellisense
  # (in case they weren't already)
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


#[=============================================================================[
Exposes a user-side helper function for creating a dynamic '*.node' library,
linked to the Addon API interface.

cmakejs_create_node_api_addon(<name> [<sources>])
cmakejs_create_node_api_addon(<name> [ALIAS <alias>] [NAMESPACE <namespace>] [NAPI_VERSION <version>] [<sources>])

(This should wrap the CMakeLists.txt-side requirements for building a Nodejs Addon)
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

    # TODO: How the exceptions are set in fallback cases can be very tricky
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
    # I suggest taking a look at the header file that CMakeRC generates
    # to understand how to grep a variety of different possiple exceptions flags
    # all into a custom one which handles all cases. The Napi way of having
    # three seperate args, that can each be defined against logic, is unfortunate
    # and we don't want to break compatibility of existing users' projects.
    # I have made one attempt at this in the past which I will revisit
    # shortly... but definitely a case of, all ideas welcome!
    if(NOT ARG_EXCEPTIONS)
      set(ARG_EXCEPTIONS "MAYBE") # YES, NO, or MAYBE...
    endif()

    if((NOT DEFINED NAPI_CPP_EXCEPTIONS) OR
        (NOT DEFINED NAPI_DISABLE_CPP_EXCEPTIONS) OR
        (NOT DEFINED NAPI_CPP_EXCEPTIONS_MAYBE)
      )

      if(ARG_EXCEPTIONS STREQUAL "YES")
        set(_NAPI_GLOBAL_EXCEPTIONS_POLICY "NAPI_CPP_EXCEPTIONS")
      elseif(ARG_EXCEPTIONS STREQUAL "NO")
        set(_NAPI_GLOBAL_EXCEPTIONS_POLICY "NAPI_DISABLE_CPP_EXCEPTIONS")
      else()
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
    if(TARGET cmake-js::node-addon-api)
      # link the c++ library if it has been defined
      target_link_libraries(${name} PRIVATE cmake-js::node-addon-api)
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
      LIBRARY_OUTPUT_DIRECTORY "${CMAKEJS_BINARY_DIR}/lib" # Instead, we call 'cmakejs_create_addon_bindings()'
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

    # (experimental) :)
    # cmakejs_create_addon_bindings(${name})

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

It's not quite over yet, but the idea should be becoming clear now...
]=============================================================================]#


include (CMakePackageConfigHelpers)
file (WRITE "${CMAKE_CURRENT_BINARY_DIR}/CMakeJSConfig.cmake.in" [==[
@PACKAGE_INIT@

include (${CMAKE_CURRENT_LIST_DIR}/CMakeJSTargets.cmake)

check_required_components (cmake-js)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/cmake-js/share/cmake")

# Tell the user what to do
message(STATUS "-- Appended cmake-js CMake API to your module path.")
message(STATUS "-- You may 'include(CMakeJS)' in your CMake project to use our API and/or relocatable targets.")
message(STATUS "-- Read more about our 'CMakeJS.cmake' API here:")
message(STATUS "-- https://github.com/cmake-js/cmake-js/blob/master/README.md")
]==])

# create cmake config file
configure_package_config_file (
    "${CMAKE_CURRENT_BINARY_DIR}/CMakeJSConfig.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/CMakeJSConfig.cmake"
  INSTALL_DESTINATION
    "${CMAKE_INSTALL_LIBDIR}/cmake/CMakeJS"
)
# generate the version file for the cmake config file
write_basic_package_version_file (
	"${CMAKE_CURRENT_BINARY_DIR}/share/cmake/CMakeJSConfigVersion.cmake"
	VERSION ${_version}
	COMPATIBILITY AnyNewerVersion
)
# pass our module along
file(COPY "${_CMAKEJS_SCRIPT}" DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/share/cmake")

# These install blocks are predicated on the idea that our consumers want to control certain vars themselves:
#
# - CMAKE_BINARY_DIR - where they want CMake's 'configure/build' output to go
# - CMAKE_INSTALL_PREFIX - where they want CMake's 'install' output to go
#
# Our users should be free to specify things like the above as they wish; we can't possibly
# know in advance, and we don't want to be opinionated...
#
# It's not just users who will set CMAKE_INSTALL_* though; it's vcpkg and other package
# managers and installers too! (see CPack)

unset(CMAKEJS_INC_DIR)
set(CMAKEJS_INC_DIR
  $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
  $<INSTALL_INTERFACE:include>
  CACHE PATH "Installation directory for include files, a relative path that will be joined with ${CMAKE_INSTALL_PREFIX} or an absolute path."
  FORCE
)

# # copy headers (and definitions?) to build dir for distribution
# if(CMAKEJS_USING_NODE_DEV)
#   install(FILES ${CMAKE_JS_INC_FILES} DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/node")
#   install(TARGETS node-dev
#     EXPORT CMakeJSTargets
#     LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
#     ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
#     RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
#     INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
#     FILE_SET node_dev_INTERFACE_HEADERS
#   )
# endif()

install(FILES ${_CMAKEJS_SCRIPT} DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/CMakeJS")
install(TARGETS cmake-js
  EXPORT CMakeJSTargets
  LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
  ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
  RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
  INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
)

# install config files
install(FILES
  "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/CMakeJSConfig.cmake"
  "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/CMakeJSConfigVersion.cmake"
  DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/CMakeJS"
)

# install 'CMakeJSTargets' export file
install(
  EXPORT CMakeJSTargets
  FILE CMakeJSTargets.cmake
  NAMESPACE cmake-js::
  DESTINATION lib/cmake/CMakeJS
)

if(NOT CMakeJS_IS_TOP_LEVEL)

  message(STATUS [==[

-- Add this to your CMakeLists.txt to build a Node.js addon:
--

cmakejs_setup_node_api_cpp_library() # if you use `node-addon-api`

cmakejs_create_node_api_addon (
    # CMAKEJS_ADDON_NAME
    my_addon
    # SOURCES
    src/<vendor>/my_addon.cpp
    # NAPI_CPP_CUSTOM_NAMESPACE
    NAMESPACE <vendor>
  )

]==])

  # Future?
  if(CMAKEJS_USING_NODE_SEA_CONFIG)
    # https://nodejs.org/api/single-executable-applications.html
  endif()

# Global message (our CLI applies in all scenarios)
message(STATUS [==[
You may use either the regular CMake interface, or the cmake-js CLI, to build your addon!
--
-- Add this to your package.json:

{
    "name": "@<vendor>/my-addon",
    "dependencies": {
        "cmake-js": "^7.3.3"
    },
    "scripts": {
        "install":     "cmake-js install",
        "configure":   "cmake-js configure",
        "reconfigure": "cmake-js reconfigure",
        "build":       "cmake-js build",
        "rebuild":     "cmake-js rebuild"
        "clean":       "cmake-js clean"
    // ...
}

-- You will be able to load your built addon in JavaScript code:
--

const my_addon = require("./build/lib/my_addon.node");

console.log(`Napi Status:  ${my_addon.hello()}`);
console.log(`Napi Version: ${my_addon.version()}`);


-- Make sure to register a module in your C/C++ code like official example does:
-- https://github.com/nodejs/node-addon-examples/blob/main/src/1-getting-started/1_hello_world/node-addon-api/hello.cc
--
-- Read more about our 'CMakeJS.cmake' API here:
-- https://github.com/cmake-js/cmake-js/blob/cmakejs_cmake_api/README.md
--
-- See more node addon examples here:
-- https://github.com/nodejs/node-addon-examples
--
-- ]==])
endif()

unset(_version)
