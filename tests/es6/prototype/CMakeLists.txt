cmake_minimum_required(VERSION 3.15)
cmake_policy(SET CMP0091 NEW)
cmake_policy(SET CMP0042 NEW)

project (addon)

if (("${CMAKE_CXX_COMPILER_ID}" MATCHES "Clang") OR ("${CMAKE_CXX_COMPILER_ID}" MATCHES "GNU"))
	set (CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++20")
endif()

include_directories(${CMAKE_JS_INC})

add_library(addon SHARED src/addon.cpp)

set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node")

target_link_libraries(addon ${CMAKE_JS_LIB})
