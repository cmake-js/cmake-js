cmake_minimum_required(VERSION 3.15)

project(hello)

include(CMakeJS)

cmakejs_create_napi_addon(
  addon
  "src/hello/addon.cpp"
)
