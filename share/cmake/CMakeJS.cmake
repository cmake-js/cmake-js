#[=============================================================================[
  CMakeJS.cmake - A proposed CMake API for cmake-js v8
  Copyright (C) 2024 Nathan J. Hood
  MIT License
  See: https://github.com/nathanjhood/NapiAddon
]=============================================================================]#

#[=============================================================================[
Check whether we have already been included (borrowed from CMakeRC)
]=============================================================================]#
# TODO: Decouple CMakeJS.cmake API version number from cmake-js version number...?
set(_version 7.3.3)

if (DEFINED CMAKE_JS_VERSION)
    message(FATAL_ERROR "You cannot use the new cmake flow with the old cmake-js binary, instead you should use cmake-js2 or cmake")
endif()

cmake_minimum_required(VERSION 3.15)
cmake_policy(VERSION 3.15)
include(CMakeParseArguments)

if(COMMAND cmakejs_napi_addon_add_sources)
    if(NOT DEFINED _CMAKEJS_VERSION OR NOT (_version STREQUAL _CMAKEJS_VERSION))
        message(WARNING "More than one 'CMakeJS.cmake' version has been included in this project.")
    endif()
    # CMakeJS has already been included! Don't do anything
    return()
endif()

set(_CMAKEJS_VERSION "${_version}" CACHE INTERNAL "Current 'CMakeJS.cmake' version. Used for checking for conflicts")

set(_CMAKEJS_SCRIPT "${CMAKE_CURRENT_LIST_FILE}" CACHE INTERNAL "Path to current 'CMakeJS.cmake' script")
set(_CMAKEJS_DIR "${CMAKE_CURRENT_LIST_DIR}/../.." CACHE INTERNAL "Path to cmake-js directory")

# Default build output directory, if not specified with '-DCMAKEJS_BINARY_DIR:PATH=/some/dir'
if(NOT DEFINED CMAKEJS_BINARY_DIR)
    set(CMAKEJS_BINARY_DIR "${CMAKE_BINARY_DIR}")
endif()

message (STATUS "\n-- CMakeJS.cmake v${_CMAKEJS_VERSION}")

#[=============================================================================[
Setup optional targets dependency chain, e.g., for end-user specification with
VCPKG_FEATURE_FLAGS or by passing for example '-DCMAKE_NODE_API:BOOL=FALSE'
]=============================================================================]#

set (CMAKEJS_TARGETS "")
include(CMakeDependentOption)
option                (CMAKEJS_NODE_DEV         "Supply cmake-js::node-dev target for linkage" ON)
cmake_dependent_option(CMAKEJS_NODE_API         "Supply cmake-js::node-api target for linkage"       ON CMAKEJS_NODE_DEV OFF)
cmake_dependent_option(CMAKEJS_NODE_ADDON_API   "Supply cmake-js::node-addon-api target for linkage" ON CMAKEJS_NODE_API OFF)
cmake_dependent_option(CMAKEJS_CMAKEJS          "Supply cmake-js::cmake-js target for linkage"       ON CMAKEJS_NODE_ADDON_API OFF)

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

#[=======================================================================[
FindCMakeJs.cmake
--------

Find the native CMakeJs includes, source, and library

(This codeblock typically belongs in a file named 'FindCMakeJS.cmake' for
distribution...)

This module defines

::

  CMAKEJS_EXECUTABLE, the cmake-js binary

]=======================================================================]#

# Check for cmake-js installations
find_program(CMAKEJS_EXECUTABLE
  NAMES "cmake-js" "cmake-js.exe"
  PATHS "${_CMAKEJS_DIR}/bin"
  DOC "cmake-js project-local npm package binary"
  REQUIRED
)
if (NOT CMAKEJS_EXECUTABLE)
    message(FATAL_ERROR "cmake-js not found! Make sure you have installed your node dependencies fully.")
    return()
endif()

_cmakejs_normalize_path(CMAKEJS_EXECUTABLE)
string(REGEX REPLACE "[\r\n\"]" "" CMAKEJS_EXECUTABLE "${CMAKEJS_EXECUTABLE}")

#[=============================================================================[
Get the in-use NodeJS binary for executing NodeJS commands in CMake scripts.

Provides

::

  NODE_EXECUTABLE, the NodeJS runtime binary being used
  NODE_VERSION, the version of the NodeJS runtime binary being used

]=============================================================================]#
function(cmakejs_acquire_node_executable)
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
endfunction()

#[=============================================================================[
Get NodeJS C Addon development files.

Provides
::

  NODE_API_HEADERS_DIR, where to find node_api.h, etc.
  NODE_API_INC_FILES, the headers required to use Node Addon API.

]=============================================================================]#
function(cmakejs_acquire_napi_c_files)
    execute_process(
      COMMAND "${NODE_EXECUTABLE}" -p "require('node-api-headers').include_dir"
      WORKING_DIRECTORY "${_CMAKEJS_DIR}"
      OUTPUT_VARIABLE NODE_API_HEADERS_DIR
      # COMMAND_ERROR_IS_FATAL ANY
    )
    string(REGEX REPLACE "[\r\n\"]" "" NODE_API_HEADERS_DIR "${NODE_API_HEADERS_DIR}")

    # relocate...
    file(GLOB _NODE_API_INC_FILES "${NODE_API_HEADERS_DIR}/*.h")
    file(COPY ${_NODE_API_INC_FILES} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/include/node-api-headers")
    unset(_NODE_API_INC_FILES)

    # target include directories (as if 'node-api-headers' were an isolated CMake project...)
    set(NODE_API_HEADERS_DIR
      $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-api-headers>
      $<INSTALL_INTERFACE:include/node-api-headers>
    )
    set(NODE_API_HEADERS_DIR "${NODE_API_HEADERS_DIR}" CACHE PATH "Node API Headers directory." FORCE)

    unset(NODE_API_INC_FILES)
    file(GLOB NODE_API_INC_FILES "${NODE_API_HEADERS_DIR}/*.h")
    set(NODE_API_INC_FILES "${NODE_API_INC_FILES}" CACHE FILEPATH "Node API Header files." FORCE)
    source_group("Node Addon API (C)" FILES "${NODE_API_INC_FILES}")

    if(VERBOSE)
        message(STATUS "NODE_API_HEADERS_DIR: ${NODE_API_HEADERS_DIR}")
    endif()
endfunction()

#[=============================================================================[
Get NodeJS C++ Addon development files.

Provides
::

  NODE_ADDON_API_DIR, where to find napi.h, etc.
  NODE_ADDON_API_INC_FILES, the headers required to use Node Addon API.

]=============================================================================]#
function(cmakejs_acquire_napi_cpp_files)
    execute_process(
      COMMAND "${NODE_EXECUTABLE}" -p "require('node-addon-api').include"
      WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
      OUTPUT_VARIABLE NODE_ADDON_API_DIR
      # COMMAND_ERROR_IS_FATAL ANY
    )
    string(REGEX REPLACE "[\r\n\"]" "" NODE_ADDON_API_DIR "${NODE_ADDON_API_DIR}")

    # relocate...
    file(GLOB _NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_DIR}/*.h")
    file(COPY ${_NODE_ADDON_API_INC_FILES} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/include/node-addon-api")
    unset(_NODE_ADDON_API_INC_FILES)

    # target include directories (as if 'node-addon-api' were an isolated CMake project...)
    set(NODE_ADDON_API_DIR
      $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/node-addon-api>
      $<INSTALL_INTERFACE:include/node-addon-api>
    )
    set(NODE_ADDON_API_DIR "${NODE_ADDON_API_DIR}" CACHE PATH "Node Addon API Headers directory." FORCE)

    unset(NODE_ADDON_API_INC_FILES)
    file(GLOB NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_DIR}/*.h")
    set(NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_INC_FILES}" CACHE FILEPATH "Node Addon API Header files." FORCE)
    source_group("Node Addon API (C++)" FILES "${NODE_ADDON_API_INC_FILES}")

    if(VERBOSE)
        message(STATUS "NODE_ADDON_API_DIR: ${NODE_ADDON_API_DIR}")
    endif()
endfunction()


#[=============================================================================[
Silently create an interface library (no output) with all Addon API dependencies
resolved, for Addon targets to link with.

(This should contain most of cmake-js globally-required configuration)

Targets:

cmake-js::node-dev
cmake-js::node-api
cmake-js::node-addon-api
cmake-js::cmake-js

]=============================================================================]#
if(CMAKEJS_NODE_DEV)

  # acquire if needed...
  if(NOT DEFINED NODE_EXECUTABLE)
    cmakejs_acquire_node_executable()
    message(DEBUG "NODE_EXECUTABLE: ${NODE_EXECUTABLE}")
    message(DEBUG "NODE_VERSION: ${NODE_VERSION}")
  endif()

  # NodeJS system installation headers
  # cmake-js::node-dev
  add_library                 (node-dev INTERFACE)
  add_library                 (cmake-js::node-dev ALIAS node-dev)
  if (MSVC)
    target_sources              (node-dev INTERFACE "${_CMAKEJS_DIR}/lib/cpp/win_delay_load_hook.cc")
  endif()

  list(APPEND CMAKEJS_TARGETS  node-dev)
  set_target_properties       (node-dev PROPERTIES VERSION ${NODE_VERSION})
endif()

if(CMAKEJS_NODE_API)
  # Acquire if needed...
  if(NOT DEFINED NODE_API_HEADERS_DIR)
    cmakejs_acquire_napi_c_files()
    message(DEBUG "NODE_API_HEADERS_DIR: ${NODE_API_HEADERS_DIR}")
    if(NOT DEFINED NODE_API_INC_FILES)
      file(GLOB NODE_API_INC_FILES "${NODE_API_HEADERS_DIR}/*.h")
      set(NODE_API_INC_FILES "${NODE_API_INC_FILES}" CACHE FILEPATH "Node API Header files." FORCE)
      source_group("Node Addon API (C)" FILES "${NODE_API_INC_FILES}")
    endif()
  endif()


  # Node API (C) - requires NodeJS system installation headers
  # cmake-js::node-api
  add_library                 (node-api INTERFACE)
  add_library                 (cmake-js::node-api ALIAS node-api)
  target_include_directories  (node-api INTERFACE "${NODE_API_HEADERS_DIR}")
  target_sources              (node-api INTERFACE "${NODE_API_INC_FILES}")
  target_link_libraries       (node-api INTERFACE cmake-js::node-dev)
  set_target_properties       (node-api PROPERTIES VERSION 6.1.0)


  # find the node api definition to generate into node.lib
  if (MSVC)
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
  endif()
  
  list(APPEND CMAKEJS_TARGETS  node-api)
endif()

if(CMAKEJS_NODE_ADDON_API)

  # Acquire if needed...
  if(NOT DEFINED NODE_ADDON_API_DIR)
    cmakejs_acquire_napi_cpp_files()
    message(DEBUG "NODE_ADDON_API_DIR: ${NODE_ADDON_API_DIR}")
    if(NOT DEFINED NODE_ADDON_API_INC_FILES)
      file(GLOB NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_DIR}/*.h")
      set(NODE_ADDON_API_INC_FILES "${NODE_ADDON_API_INC_FILES}" CACHE FILEPATH "Node Addon API Header files." FORCE)
      source_group("Node Addon API (C++)" FILES "${NODE_ADDON_API_INC_FILES}")
    endif()
  endif()

  # Node Addon API (C++) - requires Node API (C)
  # cmake-js::node-addon-api
  add_library                 (node-addon-api INTERFACE)
  add_library                 (cmake-js::node-addon-api ALIAS node-addon-api)
  target_include_directories  (node-addon-api INTERFACE "${NODE_ADDON_API_DIR}")
  target_sources              (node-addon-api INTERFACE "${NODE_ADDON_API_INC_FILES}")
  target_link_libraries       (node-addon-api INTERFACE cmake-js::node-api)
  set_target_properties       (node-addon-api PROPERTIES VERSION 1.1.0)
  list(APPEND CMAKEJS_TARGETS  node-addon-api)
endif()

if(CMAKEJS_CMAKEJS)
  # CMakeJS API - requires Node Addon API (C++), resolves the full Napi Addon dependency chain
  # cmake-js::cmake-js
  add_library                 (cmake-js INTERFACE)
  add_library                 (cmake-js::cmake-js ALIAS cmake-js)
  target_link_libraries       (cmake-js INTERFACE cmake-js::node-addon-api)
  target_compile_definitions  (cmake-js INTERFACE "BUILDING_NODE_EXTENSION")
  target_compile_features     (cmake-js INTERFACE cxx_nullptr) # Signal a basic C++11 feature to require C++11.
  set_target_properties       (cmake-js PROPERTIES VERSION   7.3.3)
  set_target_properties       (cmake-js PROPERTIES SOVERSION 7)
  set_target_properties       (cmake-js PROPERTIES COMPATIBLE_INTERFACE_STRING cmake-js_MAJOR_VERSION)

  if(MSVC)
      set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>" CACHE STRING "Select the MSVC runtime library for use by compilers targeting the MSVC ABI." FORCE)
  endif()

  list(APPEND CMAKEJS_TARGETS cmake-js)

  # Node that the below function definitions are contained inside 'if(CMAKEJS_CMAKEJS)' (our main helper library)....

  #[=============================================================================[
  Exposes a user-side helper function for creating a dynamic '*.node' library,
  linked to the Addon API interface.

  cmakejs_create_napi_addon(<name> [<sources>])
  cmakejs_create_napi_addon(<name> [ALIAS <alias>] [NAMESPACE <namespace>] [NAPI_VERSION <version>] [<sources>])

  (This should wrap the CMakeLists.txt-side requirements for building a Napi Addon)
  ]=============================================================================]#
  function(cmakejs_create_napi_addon name)

      # Avoid duplicate target names
      if(TARGET ${name})
          message(SEND_ERROR "'cmakejs_create_napi_addon()' given target '${name}' which is already exists. Please choose a unique name for this Addon target.")
          return()
      endif()

      set(options)
      set(args ALIAS NAMESPACE NAPI_VERSION)
      set(list_args)
      cmake_parse_arguments(ARG "${options}" "${args}" "${list_args}" "${ARGN}")

      # Generate the identifier for the resource library's namespace
      set(ns_re "[a-zA-Z_][a-zA-Z0-9_]*")

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

      # Needs more validation...
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

      if(VERBOSE)
          message(STATUS "Configuring Napi Addon: ${name}")
      endif()

      # Begin a new Napi Addon target

      add_library(${name} SHARED)
      add_library(${name_alt}::${name} ALIAS ${name})

      target_link_libraries(${name} PRIVATE cmake-js::cmake-js)

      set_property(
        TARGET ${name}
        PROPERTY "${name}_IS_NAPI_ADDON_LIBRARY" TRUE
      )

      set_target_properties(${name}
        PROPERTIES

        LIBRARY_OUTPUT_NAME "${name}"
        PREFIX ""
        SUFFIX ".node"

        ARCHIVE_OUTPUT_DIRECTORY "${CMAKEJS_BINARY_DIR}/lib"
        LIBRARY_OUTPUT_DIRECTORY "${CMAKEJS_BINARY_DIR}/lib"
        RUNTIME_OUTPUT_DIRECTORY "${CMAKEJS_BINARY_DIR}/bin"

        # # Conventional C++-style debug settings might be useful to have...
        # LIBRARY_OUTPUT_NAME_DEBUG "d${name}"
        # ARCHIVE_OUTPUT_DIRECTORY_DEBUG "${CMAKEJS_BINARY_DIR}/lib/Debug"
        # LIBRARY_OUTPUT_DIRECTORY_DEBUG "${CMAKEJS_BINARY_DIR}/lib/Debug"
        # RUNTIME_OUTPUT_DIRECTORY_DEBUG "${CMAKEJS_BINARY_DIR}/bin/Debug"
      )

      cmakejs_napi_addon_add_sources(${name} ${ARG_UNPARSED_ARGUMENTS})

      cmakejs_napi_addon_add_definitions(${name}
        PRIVATE # These definitions only belong to this unique target
        "CMAKEJS_ADDON_NAME=${name}"
        "CMAKEJS_ADDON_ALIAS=${name_alt}"
        "NAPI_CPP_CUSTOM_NAMESPACE=${ARG_NAMESPACE}"
      )

      cmakejs_napi_addon_add_definitions(${name}
        PUBLIC # These definitions are shared with anything that links to this addon
        "NAPI_VERSION=${ARG_NAPI_VERSION}"
        "BUILDING_NODE_EXTENSION"
      )

  endfunction()

  #[=============================================================================[
  Add source files to an existing Napi Addon target.

  cmakejs_napi_addon_add_sources(<name> [items1...])
  cmakejs_napi_addon_add_sources(<name> [BASE_DIRS <dirs>] [items1...])
  cmakejs_napi_addon_add_sources(<name> [<INTERFACE|PUBLIC|PRIVATE> [items1...] [<INTERFACE|PUBLIC|PRIVATE> [items2...] ...]])
  cmakejs_napi_addon_add_sources(<name> [<INTERFACE|PUBLIC|PRIVATE> [BASE_DIRS [<dirs>...]] [items1...]...)
  ]=============================================================================]#
  function(cmakejs_napi_addon_add_sources name)

      # Check that this is a Node Addon target
      get_target_property(is_addon_lib ${name} ${name}_IS_NAPI_ADDON_LIBRARY)
      if(NOT TARGET ${name} OR NOT is_addon_lib)
          message(SEND_ERROR "'cmakejs_napi_addon_add_sources()' called on '${name}' which is not an existing napi addon library")
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

      # Generate the identifier for the resource library's namespace
      get_target_property(lib_namespace "${name}" ${name}_ADDON_NAMESPACE)

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
  Add pre-processor definitions to an existing Napi Addon target.

  cmakejs_napi_addon_add_definitions(<name> [items1...])
  cmakejs_napi_addon_add_definitions(<name> <INTERFACE|PUBLIC|PRIVATE> [items1...] [<INTERFACE|PUBLIC|PRIVATE> [items2...] ...])
  ]=============================================================================]#
  function(cmakejs_napi_addon_add_definitions name)

      # Check that this is a Node Addon target
      get_target_property(is_addon_lib ${name} ${name}_IS_NAPI_ADDON_LIBRARY)
      if(NOT TARGET ${name} OR NOT is_addon_lib)
          message(SEND_ERROR "'cmakejs_napi_addon_add_definitions()' called on '${name}' which is not an existing napi addon library")
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

endif() # CMAKEJS_CMAKEJS

# This should enable each target to behave well with intellisense (in case they weren't already)
foreach(TARGET IN LISTS CMAKEJS_TARGETS)
  target_include_directories(${TARGET}
    INTERFACE
    $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
    $<INSTALL_INTERFACE:include>
  )
endforeach()

#[=============================================================================[
Collect targets and allow CMake to provide them
]=============================================================================]#

export (
  TARGETS ${CMAKEJS_TARGETS}
  FILE share/cmake/CMakeJSTargets.cmake
  NAMESPACE cmake-js::
)


include (CMakePackageConfigHelpers)
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/CMakeJSConfig.cmake.in" [==[
@PACKAGE_INIT@

include(${CMAKE_CURRENT_LIST_DIR}/CMakeJSTargets.cmake)

check_required_components(cmake-js)
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

# # copy headers (and definitions?) to build dir for distribution
# if(CMAKEJS_NODE_DEV)
#   install(FILES ${CMAKE_JS_INC_FILES} DESTINATION "include/node")
# endif()

if(CMAKEJS_NODE_API)
  install(FILES ${NODE_API_INC_FILES} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/include/node-api-headers")
endif()

if(CMAKEJS_NODE_ADDON_API)
  install(FILES ${NODE_ADDON_API_INC_FILES} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/include/node-addon-api")
endif()

# This whole block that follows, and the last changes I made to this file (re: 'file/directory reolcation')
# is all predicated on the idea that our consumers want to control certain vars themselves:
#
# - CMAKE_BINARY_DIR - where they want CMake's 'configure/build' output to go
# - CMAKE_INSTALL_PREFIX - where they want CMake's 'install' output to go
#
# Our users should be free to specify things like the above as they wish; we can't possibly
# know in advance, and we don't want to be opinionated...
#
# So, instead, we copied all of our files into a 'CMake-space' and next
# we will configure the (unknowable-to-us) CMAKE_INSTALL_* vars to prefix the directories
# of our dependencies. Our users will set CMAKE_INSTALL_* themselves, and *their* CMake
# will know where our shipped files went (as will they, since they set it). They just do
# 'target_link_libraries(<name> cmake-js::our-lib)', and *their* CMake will know where
# it put those files on *their* system.
#
# In summary: you don't ship absolute paths. :)
#
# It's not just users who will set CMAKE_INSTALL_* though; it's vcpkg and other package
# managers and installers too! (see CPack)
#
# Note that none of these commands install anything. It just prepares an 'install'
# target, that users can install to wherever they set CMAKE_INSTALL_PREFIX to.
# To do this, they set '-DCMAKE_INSTALL_PREFIX=./install', configure, then build the
# 'install' target.

include(GNUInstallDirs)

# configure a 'CMakeJSTargets' export file for install
install(TARGETS ${CMAKEJS_TARGETS}
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

# Tell the user what to do
message(STATUS "\ncmake-js v${_CMAKEJS_VERSION} has made the following targets available for linkage:\n")
foreach(TARGET IN LISTS CMAKEJS_TARGETS)
    get_target_property(_v ${TARGET} VERSION)
    message(STATUS "cmake-js::${TARGET} ${_v}")
endforeach()

if(NOT CMakeJS_IS_TOP_LEVEL)
    message(STATUS [==[
--
-- To build a Node.js addon,
--
-- Add this to your CMakeLists.txt:
--

cmakejs_create_napi_addon (
    # CMAKEJS_ADDON_NAME
    my_addon
    # SOURCES
    src/<vendor>/my_addon.cpp
    # NAPI_CPP_CUSTOM_NAMESPACE
    NAMESPACE <vendor>
  )

-- You will be able to load your addon in JavaScript code:
--

const my_addon = require("./build/lib/my_addon.node");

console.log(`Napi Status:  ${my_addon.hello()}`);
console.log(`Napi Version: ${my_addon.version()}`);

-- You may use either the regular CMake interface, or the cmake-js CLI, to build your addon!
--

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
