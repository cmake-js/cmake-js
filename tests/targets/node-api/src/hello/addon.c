/**
 * @file addon.cc
 * @brief A quick 'hello world' Node Addon in C
*/

// Required header
#if __has_include(<node_api.h>)

#include <node_api.h>

// I don't actually know how to build one of these
// in C, so just trying to compile these vars for now!

// If our target works, the header will be found and this will
// compile. The addon probably won't do anything, until
// someone figures out how these work!

napi_env env;
napi_status status;

#else // !__has_include(<napi.h>) || !BUILDING_NODE_EXTENSION
 #warning "Warning: Cannot find '<node_api.h>' - try running 'npm -g install cmake-js'..."
#endif
