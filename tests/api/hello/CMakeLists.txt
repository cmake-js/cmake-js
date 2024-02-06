cmake_minimum_required(VERSION 3.15)

project(hello)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/cmake-js/share/cmake")
include(CMakeJS)

# cmakejs_setup_node_api_addons()
cmakejs_setup_node_addon_api_addons()

cmakejs_create_napi_addon(
  addon
  "src/hello/addon.cpp"
)
target_link_libraries(addon PRIVATE cmake-js::node-addon-api) # TODO - maybe this can be done automatically