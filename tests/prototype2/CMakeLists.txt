cmake_minimum_required(VERSION 2.8)

project (addon2)

include_directories(${CMAKE_JS_INC})

add_library(${PROJECT_NAME} SHARED src/addon.cpp)

target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})