cmake_minimum_required(VERSION 2.8)

project (addon)

include_directories(${CMAKE_JS_INC})

add_library(addon SHARED src/addon.cpp)