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
        # FILE_SET node_addon_api_INTERFACE_HEADERS
        # TYPE HEADERS
        # BASE_DIRS
        #   $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
        #   $<INSTALL_INTERFACE:include>
        # FILES
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
    # FILE_SET node_addon_api_INTERFACE_HEADERS
  )
endfunction()