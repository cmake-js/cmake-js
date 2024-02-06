cmake_minimum_required(VERSION 3.15)

project(hello)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/cmake-js/share/cmake")
include(CMakeJS)

# cmakejs_setup_node_api_c_library() # This can be used, but is called by cmakejs_create_node_api_addon
cmakejs_setup_node_api_cpp_library() # Search for and link to node-addon-api

cmakejs_create_node_api_addon(
  addon
  "src/hello/addon.cpp"
)