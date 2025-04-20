
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
        # FILE_SET node_api_INTERFACE_HEADERS
        # TYPE HEADERS
        # BASE_DIRS
        #   $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
        #   $<INSTALL_INTERFACE:include>
        # FILES
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
    # FILE_SET node_api_INTERFACE_HEADERS
  )
endfunction()
