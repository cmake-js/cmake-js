cmake_minimum_required(VERSION 3.15)

project(hello)

set(CMAKEJS_USING_NODE_ADDON_API FALSE) # this should have been done with '--link-level=1' on the CLI, testing this way for now

# For CMake IDE tools support (do yarn/install first and keep your node_modules folder around)
if(NOT DEFINED CMAKE_JS_VERSION)
  list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")
endif()

include(CMakeJS)

add_library(addon SHARED "src/hello/addon.cc")
target_link_libraries(addon PRIVATE cmake-js::node-api) # relocatable deps resolved!
set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node")
set_target_properties(addon PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

# For Visual Studio generators
if(MSVC)
  set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>" CACHE STRING "Select the MSVC runtime library for use by compilers targeting the MSVC ABI." FORCE)
  if(CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
      execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
  endif()
endif()
