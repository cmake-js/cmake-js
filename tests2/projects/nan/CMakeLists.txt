cmake_minimum_required(VERSION 3.15)

project(hello)

# do yarn/install first and keep your node_modules folder around
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")

include(CMakeJS)

cmakejs_setup_node_nan_library()

add_library(addon SHARED "src/hello/addon.cc")
target_link_libraries(addon PRIVATE cmake-js::cmake-js cmake-js::node-nan)
set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node")
set_target_properties(addon PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
