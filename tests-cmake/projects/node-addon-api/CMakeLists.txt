cmake_minimum_required(VERSION 3.15)

project(hello)

# do yarn/install first and keep your node_modules folder around
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")

include(CMakeJS)

cmakejs_setup_node_api_c_library()
cmakejs_setup_node_api_cpp_library()

add_library(addon SHARED "src/hello/addon.cpp")
target_link_libraries(addon PRIVATE cmake-js::cmake-js cmake-js::node-api cmake-js::node-addon-api)
set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node")
set_target_properties(addon PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
target_compile_definitions(addon PUBLIC BUILDING_NODE_EXTENSION)
target_compile_definitions(addon PUBLIC NAPI_VERSION=8)
target_compile_definitions(addon PUBLIC NAPI_CPP_EXCEPTIONS_MAYBE)
