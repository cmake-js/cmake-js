
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
        # FILE_SET node_nan_INTERFACE_HEADERS
        # TYPE HEADERS
        # BASE_DIRS
        #   $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
        #   $<INSTALL_INTERFACE:include>
        # FILES
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
    # FILE_SET node_nan_INTERFACE_HEADERS
  )
endfunction()
