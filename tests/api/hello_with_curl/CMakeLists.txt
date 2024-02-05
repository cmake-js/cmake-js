cmake_minimum_required(VERSION 3.15)

project(hello)

find_package(CURL REQUIRED)

if(NOT DEFINED CMAKE_JS_VERSION)
  list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")
endif()

include(CMakeJS)

cmakejs_create_napi_addon(
  addon
  "src/hello/addon.cpp"
  "src/hello/get.cpp"
  "src/hello/post.cpp"
  NAMESPACE vendor
  EXCEPTIONS YES
)
# Mode project headers...
configure_file(
  "include/hello/addon.h" # from SOURCE_DIR...
  "include/hello/addon.h" # ..to BINARY_DIR
)

if(NOT EXISTS "${CMAKE_CURRENT_BINARY_DIR}/include/curl")
  # Set up cURL for transport
  file(COPY ${CURL_INCLUDE_DIR} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}/include/curl")
  set (CURL_INCLUDE_DIR
    $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/curl>
    $<INSTALL_INTERFACE:include/curl>
    CACHE PATH "Path to curl.h" FORCE
  )
endif()

target_link_libraries(addon PRIVATE CURL::libcurl)
target_include_directories(addon PRIVATE ${CURL_INCLUDE_DIR})
target_include_directories(addon PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/hello>
  $<INSTALL_INTERFACE:include/hello>
)


include(GNUInstallDirs)
# CPack prep stuff...
export (
  TARGETS addon
  FILE share/cmake/AddonTargets.cmake
  NAMESPACE hello::
)

install(TARGETS addon
  EXPORT AddonTargets
  LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
  ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
  RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
  INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
)

install(
  EXPORT AddonTargets
  FILE addonTargets.cmake
  NAMESPACE vendor::
  DESTINATION lib/cmake/hello
)
