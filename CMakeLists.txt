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

include ("${CMAKE_CURRENT_LIST_DIR}/share/cmake/CMakeJS.cmake")

# CMakeJS's own targets are abstract 'INTERFACE' targets which only exist
# within CMake's build cache - so, there is nothing to compile, here.

# We instead offer a simple test/demonstration of our API, and reserve the
# CMakeJS vendor namespace in C++/CMake land.

# PROOF OF CONCEPT:

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


  # offer a basic installer for our demo.

  # NOTE: this is part of the DEMO, I am NOT suggesting
  # cmake-js should pack and ship any addons of it's own!
  # this entire CMakeLists.txt is just purely about proof
  # of concept.

  # the following demonstrates how users can
  # easily ship either their source that automatically
  # carry all dependencies (required headers),
  # which is useful for e.g., offline machines,
  # they can build-at-home or in a VM or wokflow run
  # targeting a specific OS/platform/arch which
  # they don't have access to, and can retrieve
  # the built binaries in a tar file, then
  # send their pre-built, pre-packaged addon(s)
  # down to their remote servers, which don't
  # have C++ compilers or CMake on them.

  include(GNUInstallDirs) # dont be alarmed by this - it wont install to your system!

  export (
    TARGETS demo
    FILE share/cmake/DemoTargets.cmake
    NAMESPACE CMakeJS::
  )

  # install 'CMakeJSTargets' export file
  install(
    EXPORT DemoTargets
    FILE DemoTargets.cmake
    NAMESPACE CMakeJS::
    DESTINATION lib/cmake/CMakeJS
  )

  install(TARGETS demo
    EXPORT DemoTargets
    LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
    INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
  )


  file (WRITE "${CMAKE_CURRENT_BINARY_DIR}/DemoConfig.cmake.in" [==[
@PACKAGE_INIT@

include (${CMAKE_CURRENT_LIST_DIR}/DemoTargets.cmake)

check_required_components (cmake-js)

]==])

  # create cmake config file
  configure_package_config_file (
      "${CMAKE_CURRENT_BINARY_DIR}/DemoConfig.cmake.in"
      "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/DemoConfig.cmake"
    INSTALL_DESTINATION
      "${CMAKE_INSTALL_LIBDIR}/cmake/Demo"
  )
  # generate the version file for the cmake config file
  write_basic_package_version_file (
    "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/DemoConfigVersion.cmake"
    VERSION 7.3.3
    COMPATIBILITY AnyNewerVersion
  )

  # copy the demo types
  file(COPY
    "${CMAKE_CURRENT_LIST_DIR}/lib/demo.node.js"
    "${CMAKE_CURRENT_LIST_DIR}/lib/demo.node.ts"
    "${CMAKE_CURRENT_LIST_DIR}/lib/demo.node.d.ts"
    DESTINATION
    "${PROJECT_BINARY_DIR}/lib"
  )

  install(FILES
    "${PROJECT_BINARY_DIR}/lib/demo.node.js"
    "${PROJECT_BINARY_DIR}/lib/demo.node.ts"
    "${PROJECT_BINARY_DIR}/lib/demo.node.d.ts"
    DESTINATION
    "${CMAKE_INSTALL_LIBDIR}"
  )

  # Still seems like a lot of code for builders, so why
  # did cmake-js make the effort of defining export()
  # and install() at API level?
  # Because if I want to actually achieve any of those
  # remote scenarios highlighted above, I'd have to do
  # all this, for my addon, AND for all the cmake-js
  # targets. Since the kind cmake-js devs already
  # did their job fully at API level, whoever builds
  # an addon with it will find that... their entire
  # addon project's dependancies are already fully
  # relocatable.
  # Considering those can be quite a lot of files
  # (libnode-dev...), not to mention they can be
  # tricky to locate - and to point your IDE at correctly,
  # cmake-js users looking to implement CMake's export()
  # and install() stuff on their addons - for whatever
  # reasons they have (I mentioned a few) - will
  # likely be delighted that so much heavy work has
  # been done for them, by a slick combination of
  # it's two API's:
  #
  # - cmake-js CLI controls their project with
  # it's super handy alias-like commands
  #
  # - whatever they do and wherever they point
  # their CMake outputs and inputs at, CMake itself
  # will simply go "cmake-js::node-api? I got that
  # right here." and just "sort it all out" for the user
  #
  # - one means of sorting it out" is, cmake-js CLI
  # will kick in during config, determine if we need
  # headers (and which, according to --link-level)
  # and baiscally be a Node Addon API package manager
  # for us, resolving our deps and handing them over
  # to CMake to manage them
  #
  # - the CMake API will make building an addon a
  # very straightforward affair, should they choose
  # to either use our addon creation functions, or
  # just link to a cmake-js:: target to get everything
  # "sorted out" (the previous steps automate this)
  #
  # - if they want to pack and ship their addon as
  # source, as a prebuilt binary, or some custom
  # combo, our API is flexible enough to not burden
  # them with manually resolving all those previous
  # steps before they can take care of their own targets
  #
  # The beautiful part in the whole process is combining
  # the npm-like workflow with the power of a whole C/C++
  # compiler/linker toolchain. Developers from JS and
  # developers from C++ should bot feel equally at home,
  # whether they want to run CMake native commands or use
  # the efficient CLI (and the obvious answer is...! :) )
  #
  # The entire thing "just works", as long as they have
  # cmake-js on their package.json.
  #
  # Thanks for reading!
  # Nathan


  if(BUILD_TESTS)
      # include(CTest) # If you want to see all the test dashboard targets, uncomment this
      enable_testing()
      include("${CMAKE_CURRENT_LIST_DIR}/tests/demo/tests.cmake")
  endif()

  # offer a basic/messy CPack
  # TODO: I don't think this is fully working because there is no built
  # addon inside the binary tar outputs.
  # If it's distracting from the simplicity of the demo, remove it if you wish;
  # it isn't part of the proposed API-to-be-shipped itself at all.

  # set(CPACK_PACKAGE_CHECKSUM "${PROJECT_VERSION_TWEAK}") # git rev-parse is a good idea for this...
  set(CPACK_PACKAGE_VENDOR "cmake-js")
  set(CPACK_PACKAGE_NAME              "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-${CMAKE_SYSTEM_NAME}-${CMAKE_SYSTEM_PROCESSOR}-node_${NODE_VERSION}")
  set(CPACK_PACKAGE_FILE_NAME         "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-${CMAKE_SYSTEM_NAME}-${CMAKE_SYSTEM_PROCESSOR}-node_${NODE_VERSION}") # Multi-platform CMake API distribution
  set(CPACK_SOURCE_PACKAGE_FILE_NAME  "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-Source") # No system spec as this is un-compiled source file distribution (i.e., the Javascript API)
  set(CPACK_PACKAGE_DESCRIPTION_SUMMARY ${PROJECT_DESCRIPTION})
  set(CPACK_PACKAGE_VERSION_MAJOR ${PROJECT_VERSION_MAJOR})
  set(CPACK_PACKAGE_VERSION_MINOR ${PROJECT_VERSION_VERSION_MINOR})
  set(CPACK_PACKAGE_VERSION_PATCH ${PROJECT_VERSION_VERSION_PATCH})
  set(CPACK_PACKAGE_VERSION_TWEAK ${PROJECT_VERSION_VERSION_TWEAK})
  set(CPACK_RESOURCE_FILE_LICENSE ${PROJECT_SOURCE_DIR}/LICENSE)
  set(CPACK_RESOURCE_FILE_README  ${PROJECT_SOURCE_DIR}/README.md)
  set(CPACK_INCLUDE_TOPLEVEL_DIRECTORY ON)
  set(CPACK_COMPONENT_INCLUDE_TOPLEVEL_DIRECTORY ON)
  set(CPACK_SOURCE_GENERATOR "TGZ;ZIP") # Check out CPack's 'NSIS' installer for Win32, and the others!
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
      /dist
      /doc
      /docs
      #/bin
      #/lib
      /usr
      /out
      #/build
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
