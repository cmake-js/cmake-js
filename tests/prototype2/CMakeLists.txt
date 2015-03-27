cmake_minimum_required(VERSION 2.8)

project (addon2)

include_directories(${CMAKE_JS_INC})

add_library(addon2 SHARED src/addon.cpp)

target_link_libraries(addon2 ${CMAKE_JS_LIB})