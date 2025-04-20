cmake_minimum_required(VERSION 3.15)

project(hello)

# do yarn/install first and keep your node_modules folder around
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")

include(CMakeJS)

cmakejs_setup_node_api_c_library()
cmakejs_setup_node_api_cpp_library()

cmakejs_create_node_api_addon(addon
    src/hello/addon.cpp
)
