cmake_minimum_required(VERSION 3.15)

# If not using cmake-js CLI, fetch the API manually
if (NOT DEFINED CMAKE_JS_VERSION)
  list (APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/node_modules/cmake-js/share/cmake")
endif ()

project(hello)

include(CMakeJS)

cmakejs_create_napi_addon(
  addon
  src/hello/addon.cpp
  NAMESPACE vendor
)
