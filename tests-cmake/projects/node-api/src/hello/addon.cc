/**
 * @file addon.cc
 * @brief A quick 'hello world' Node Addon in C
 *
 * Please note that this example is from the NodeJS Addon
 * official docs, and uses 'nullptr', which does not exist
 * in 'pure' C. If you name your addon source file with an
 * extension of just '.c', the compiler/generator will assume
 * you are building in 'pure' C and this useage of 'nullptr'
 * will cause the build to fail.
 *
 * To have a more 'C-like' experience building addons in C,
 * we recommend using the extension '.cc' for your sources,
 * because this extension does not differentiate between
 * being a C file or a C++ file, unlike both '.c' and the
 * various '.cpp/cxx' file extensions.
*/

// Required header
#if __has_include(<node_api.h>)

#include <node_api.h>

napi_value vendor_addon_hello(napi_env env, napi_callback_info args)
{
  napi_value greeting;
  napi_status status;

  status = napi_create_string_utf8(env, "addon.node is online!", NAPI_AUTO_LENGTH, &greeting);
  if (status != napi_ok) return nullptr;
  return greeting;
}

napi_value vendor_addon_init(napi_env env, napi_value exports)
{
  napi_status status;
  napi_value fn;

  // Export a chosen C function under a given Javascript key

  status = napi_create_function(env, nullptr, 0, vendor_addon_hello, nullptr, &fn); // Name of function on Javascript side...
  if (status != napi_ok) return nullptr;

  status = napi_set_named_property(env, exports, "hello", fn);         // Name of function on C side...
  if (status != napi_ok) return nullptr;

  // The above expose the C function 'addon_hello' as a javascript function named '<name>.hello', etc...
  return exports;
}

// Register a new addon with the intializer function defined above
NAPI_MODULE(addon, vendor_addon_init) // (<name> to use, initializer to use)

#else // !__has_include(<node_api.h>)
 #warning "Warning: Cannot find '<node_api.h>' - try running 'npm -g install cmake-js'..."
#endif
