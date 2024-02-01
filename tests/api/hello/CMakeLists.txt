cmake_minimum_required(VERSION 3.15)

list (APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")

project(hello)

include(CMakeJS)

cmakejs_create_napi_addon(
  addon
  src/hello/addon.cpp
)
