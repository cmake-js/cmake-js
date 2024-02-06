/**
 * @file addon.cpp
 * @brief A quick 'hello world' Napi Addon in C++
*/

// Required header and flag
#if __has_include(<node_api.h>) && BUILDING_NODE_EXTENSION

#include <node_api.h>

napi_value vendor_addon_hello(napi_env env, napi_callback_info args)
{
  napi_value greeting;
  napi_status status;

  status = napi_create_string_utf8(env, "addon.node is online!", NAPI_AUTO_LENGTH, &greeting);
  if (status != napi_ok) return NULL;
  return greeting;
}

napi_value vendor_addon_init(napi_env env, napi_value exports)
{
  napi_status status;
  napi_value fn;

  // Export a chosen C function under a given Javascript key

  status = napi_create_function(env, NULL, 0, vendor_addon_hello, NULL, &fn); // Name of function on Javascript side...
  if (status != napi_ok) return NULL;

  status = napi_set_named_property(env, exports, "hello", fn);         // Name of function on C side...
  if (status != napi_ok) return NULL;

  // The above expose the C function 'addon_hello' as a javascript function named '<name>.hello', etc...
  return exports;
}

// Register a new addon with the intializer function defined above
NAPI_MODULE(addon, vendor_addon_init) // (<name> to use, initializer to use)

#else // !__has_include(<napi.h>) || !BUILDING_NODE_EXTENSION
 #warning "Warning: Cannot find '<napi.h>' - try running 'npm -g install cmake-js'..."
#endif
