cmake_minimum_required(VERSION 3.15)

project(hello)

find_package(CURL REQUIRED)

include(CMakeJS)

cmakejs_create_napi_addon(
  addon
  "src/hello/addon.cpp"
  "src/hello/post.cpp"
  NAMESPACE vendor
  EXCEPTIONS YES
)

target_link_libraries(addon PRIVATE CURL::libcurl)
target_include_directories(addon PRIVATE ${CURL_INCLUDE_DIR})

target_include_directories(addon PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include/hello>
  $<INSTALL_INTERFACE:include/hello>
)
configure_file(
  "include/hello/addon.h" # from SOURCE_DIR...
  "include/hello/addon.h" # ..to BINARY_DIR
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
