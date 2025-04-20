
#[=============================================================================[
Get NodeJS unstable development files.

Provides
::
  NODE_DEV_API_DIR, where to find node.h, etc.
  NODE_DEV_API_INC_FILES, the headers required to use Node unstable API.
  NODE_DEV_API_LIB_FILES, the .lib files required to use Node unstable API.

]=============================================================================]#
function(cmakejs_acquire_node_dev_headers)

  if(NOT DEFINED NODE_DEV_API_DIR OR NODE_DEV_API_DIR STREQUAL "")
    execute_process(
      COMMAND "${NODE_EXECUTABLE}" "${CMAKEJS_HELPER_EXECUTABLE}" "nodejs_dev_headers" "${CMAKEJS_TARGET_RUNTIME}" "${CMAKEJS_TARGET_RUNTIME_VERSION}" "${CMAKEJS_TARGET_RUNTIME_ARCH}"
      WORKING_DIRECTORY ${_CMAKEJS_DIR}
      OUTPUT_VARIABLE NODE_DEV_API_DIR
      OUTPUT_STRIP_TRAILING_WHITESPACE
    )

    if (NOT DEFINED NODE_DEV_API_DIR OR NODE_DEV_API_DIR STREQUAL "" OR NOT EXISTS "${NODE_DEV_API_DIR}")
      message(FATAL_ERROR "Failed to find NodeJS dev headers. Make sure cmake-js is able to download them or specify a path to the NodeJS include directory with -DNODE_DEV_API_DIR=/path/to/node/include")
      return()
    endif()

    message (STATUS "Auto-selected runtime headers from: ${NODE_DEV_API_DIR}")
    set(NODE_DEV_API_DIR "${NODE_DEV_API_DIR}" CACHE STRING "Node Dev Headers directory." FORCE)
  else()
    set(NODE_DEV_API_DIR "" CACHE STRING "Node Dev Headers directory.")
    message (STATUS "Using Node dev headers from ${NODE_DEV_API_DIR}")
  endif()

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
        # FILE_SET node_dev_INTERFACE_HEADERS
        # TYPE HEADERS
        # BASE_DIRS
        #   $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>
        #   $<INSTALL_INTERFACE:include>
        # FILES
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
    # FILE_SET node_dev_INTERFACE_HEADERS
  )
endfunction()
