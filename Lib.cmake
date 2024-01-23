cmake_minimum_required(VERSION 3.15)

# setup some cmake required config
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
add_definitions("-DBUILDING_NODE_EXTENSION")

# In some configurations MD builds will crash upon attempting to free memory.
# This tries to encourage MT builds which are larger but less likely to have this crash.
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

# Setup some variables
if(NOT CMAKE_BUILD_TYPE)
    SET (CMAKE_BUILD_TYPE "Release" CACHE STRING "Choose the type of build." FORCE)
endif()
if(NOT CMAKE_LIBRARY_OUTPUT_DIRECTORY)
    set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/${CMAKE_BUILD_TYPE}")
endif()

set(NODE_PATH "node") # TODO - allow setting externally

# Find versions info
execute_process(COMMAND ${NODE_PATH} "${CMAKE_CURRENT_LIST_DIR}/bin/cmake-js-versions"
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE CMAKE_JS_VERSIONS
)
if (NOT DEFINED CMAKE_JS_VERSIONS OR "${CMAKE_JS_VERSIONS}" STREQUAL "")
    message(FATAL_ERROR "Failed to find cmake-js and nodejs versions!")
endif()
string(REGEX MATCH "CMAKEJS_VERSION ([0-9a-zA-Z\.]+)" _ ${CMAKE_JS_VERSIONS})
set(CMAKE_JS_VERSION ${CMAKE_MATCH_1})
string(REGEX MATCH "NODE_RUNTIME ([0-9a-zA-Z\.]+)" _ ${CMAKE_JS_VERSIONS})
set(NODE_RUNTIME ${CMAKE_MATCH_1})
string(REGEX MATCH "NODE_RUNTIMEVERSION ([0-9a-zA-Z\.]+)" _ ${CMAKE_JS_VERSIONS})
set(NODE_RUNTIMEVERSION ${CMAKE_MATCH_1})
string(REGEX MATCH "NODE_ARCH ([0-9a-zA-Z\.]+)" _ ${CMAKE_JS_VERSIONS})
set(NODE_ARCH ${CMAKE_MATCH_1})

set(CMAKE_JS_PATH ${CMAKE_CURRENT_LIST_DIR}) # cache value of CMAKE_CURRENT_LIST_DIR, as it changes inside function calls

# cmake-js version of CMake `add_library` specifically for node addons
FUNCTION (cmake_js_add_node_addon PROJECT_NAME)
	cmake_parse_arguments(
        PARSED_ARGS # prefix of output variables
        "OLD_ADDON_API" # list of names of the boolean arguments (only defined ones will be true)
        "" # list of names of mono-valued arguments
        "SOURCES" # list of names of multi-valued arguments (output variables are lists)
        ${ARGN} # arguments of the function to parse, here we take the all original ones
    )

    # windows delay hook
    set(CMAKE_JS_SRC "") 
    if (MSVC)
        list (APPEND CMAKE_JS_SRC "${CMAKE_JS_PATH}/lib/cpp/win_delay_load_hook.cc")
    endif()

	# Setup the library and some default config
    add_library(${PROJECT_NAME} SHARED ${PARSED_ARGS_SOURCES} ${CMAKE_JS_SRC})
    set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

    if (OLD_ADDON_API)
        # # Try finding nan
        # execute_process(COMMAND ${NODE_PATH} -p "require('nan').include"
        #     WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        #     OUTPUT_VARIABLE NODE_NAN_DIR
        #     OUTPUT_STRIP_TRAILING_WHITESPACE
        # )
        # if (DEFINED NODE_ADDON_API_DIR AND NOT "${NODE_NAN_DIR}" STREQUAL "")
        #     string(REGEX REPLACE "[\"]" "" NODE_NAN_DIR ${NODE_NAN_DIR})
        #     message("Found nan: ${NODE_NAN_DIR}")
        #     target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_NAN_DIR})
        # endif()
        
        # TODO nan and headers

        # include headers
        set (NODE_HEADERS_DIR "") # TODO
        target_include_directories(${PROJECT_NAME} PRIVATE
            # some runtimes provide tidy headers
            "${NODE_HEADERS_DIR}/include/node"
            # some runtimes provide a lot more stuff
            "${NODE_HEADERS_DIR}/src"
            "${NODE_HEADERS_DIR}/deps/v8/include"
            "${NODE_HEADERS_DIR}/deps/uv/include"
        )
        
    else()
        # Find node-addon-api
        execute_process(COMMAND ${NODE_PATH} -p "require('node-api-headers').include_dir"
            WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
            OUTPUT_VARIABLE NODE_API_HEADERS_DIR
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
        if (DEFINED NODE_API_HEADERS_DIR AND NOT "${NODE_API_HEADERS_DIR}" STREQUAL "")
            message("Found node-api-headers: ${NODE_API_HEADERS_DIR}")
            target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_API_HEADERS_DIR})
        else()
            message(FATAL_ERROR "Failed to find node-api-headers!")
        endif()

        # Try finding node-addon-api
        execute_process(COMMAND ${NODE_PATH} -p "require('node-addon-api').include"
            WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
            OUTPUT_VARIABLE NODE_ADDON_API_DIR
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
        if (DEFINED NODE_ADDON_API_DIR AND NOT "${NODE_ADDON_API_DIR}" STREQUAL "")
            string(REGEX REPLACE "[\"]" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
            message("Found node-addon-api: ${NODE_ADDON_API_DIR}")
            target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR})
        endif()

        # Generate node.lib if needed
        if(MSVC)
            # Find node-addon-api
            execute_process(COMMAND ${NODE_PATH} -p "require('node-api-headers').def_paths.node_api_def"
                WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
                OUTPUT_VARIABLE NODE_API_DEF_PATH
                OUTPUT_STRIP_TRAILING_WHITESPACE
            )
            if (DEFINED NODE_API_DEF_PATH AND NOT "${NODE_API_DEF_PATH}" STREQUAL "")
                # Generate node.lib 
                set(CMAKE_JS_NODELIB_TARGET "${CMAKE_BINARY_DIR}/node.lib")
                execute_process(COMMAND ${CMAKE_AR} /def:${NODE_API_DEF_PATH} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
                target_link_libraries(${PROJECT_NAME} PRIVATE ${CMAKE_JS_NODELIB_TARGET})
            else()
                message(FATAL_ERROR "Failed to find node-api-headers node_api_def!")
            endif()
            
        endif()
    endif()

    if (MSVC)
        # setup delayload
        target_link_options(${PROJECT_NAME} PRIVATE "/DELAYLOAD:NODE.EXE")
        target_link_libraries(${PROJECT_NAME} PRIVATE delayimp)

        if (CMAKE_SYSTEM_PROCESSOR MATCHES "(x86)|(X86)")
            target_link_options(${PROJECT_NAME} PUBLIC "/SAFESEH:NO")
        endif()
    endif()

ENDFUNCTION ()