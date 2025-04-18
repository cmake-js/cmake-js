/**
 * @file addon.cpp
 * @brief A quick 'hello world' Napi Addon in C++
*/

// Required header and C++ flag
#if __has_include(<napi.h>) && BUILDING_NODE_EXTENSION

#include <napi.h>

#ifndef STRINGIFY
# define STRINGIFY_HELPER(n) #n
# define STRINGIFY(n) STRINGIFY_HELPER(n)
#endif

Napi::Value Hello(const Napi::CallbackInfo& info) {
  return Napi::String::New(info.Env(), STRINGIFY(CMAKEJS_ADDON_NAME)".node is online!");
}

Napi::Value Version(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), NAPI_VERSION);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {

  // Export a chosen C++ function under a given Javascript key
  exports.Set(
    Napi::String::New(env, "hello"), // Name of function on Javascript side...
    Napi::Function::New(env, Hello)  // Name of function on C++ side...
  );

  exports.Set(
    Napi::String::New(env, "version"),
    Napi::Function::New(env, Version)
  );

  // The above will expose the C++ function 'Hello' as a javascript function
  // named 'hello', etc...
  return exports;
}

// Register a new addon with the intializer function defined above
NODE_API_MODULE(CMAKEJS_ADDON_NAME, Init) // (name to use, initializer to use)


#else // !__has_include(<napi.h>) || !BUILDING_NODE_EXTENSION
 #warning "Warning: Cannot find '<napi.h>' - try running 'npm -g install cmake-js'..."
#endif
