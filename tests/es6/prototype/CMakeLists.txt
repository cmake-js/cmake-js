cmake_minimum_required(VERSION 2.8)

project (addon)

include_directories(${CMAKE_JS_INC})

add_library(addon SHARED src/addon.cpp)

set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node")

target_link_libraries(addon ${CMAKE_JS_LIB})
