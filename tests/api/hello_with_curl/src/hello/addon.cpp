/**
 * @file addon.cpp
 * @brief A quick 'HTTP POST' Napi Addon in C++ with CURL
*/

#include <string>

// Required header and C++ flag
#if __has_include(<napi.h>) && BUILDING_NODE_EXTENSION && NAPI_CPP_EXCEPTIONS

#include <napi.h>

#include "hello/addon.h"

#ifndef STRINGIFY
# define STRINGIFY_HELPER(n) #n
# define STRINGIFY(n) STRINGIFY_HELPER(n)
#endif

namespace Napi
{
#ifdef    NAPI_CPP_CUSTOM_NAMESPACE
namespace NAPI_CPP_CUSTOM_NAMESPACE
{
#endif

Napi::Value Hello(const Napi::CallbackInfo& info) {
  return Napi::String::New(info.Env(), STRINGIFY(CMAKEJS_ADDON_NAME)".node v." STRINGIFY(@PROJECT_VERSION@)" is online!");
}

Napi::Value NapiVersion(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), NAPI_VERSION);
}

Napi::Value CurlVersion(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), CURLVERSION_NOW);
}

Napi::Value Get(const Napi::CallbackInfo& args) {

  const Napi::Env env = args.Env();

  // Arguments required: at least one, and no more than two
  if (args.Length() != 2) {
    // NAPI_CPP_EXCEPTIONS = YES
    Napi::TypeError::New(env, "Wrong number of arguments! Please supply a url string, and the string data to POST, in that order").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Param 1 must be a url string
  // Param 2 must be a redirect boolean
  if (!args[0].IsString() || !args[1].IsBoolean()) {
    // NAPI_CPP_EXCEPTIONS = YES
    Napi::TypeError::New(env, "Wrong type of arguments! Please supply a url string, and a boolean whether to follow redirected url's, in that order").ThrowAsJavaScriptException();
    return env.Null();
  }

  /* First set the URL that is about to receive our POST. This URL can just as well be an https:// URL if that is what should receive the data. */
  std::string url = args[0].ToString().Utf8Value();

  /* Now specify the redirect follow mode */
  bool follow = args[1].ToBoolean().Value();

  int status;

  try {

    // Try to get the data from the url
    status = hello_addon_get(url.data(), follow);

    NAPI_THROW_IF_FAILED(env, status) // This behaviour changes depending on EXCEPTIONS policy (can be YES, NO, or MAYBE)

  } catch (const std::exception &x) {

    // If there was an error...
    std::string message(x.what());
    message += '\n';
    message += STRINGIFY(CMAKEJS_ADDON_NAME)".node: could not get the following request:\n";
    message += "url: ";
    message += args[0].As<Napi::String>();
    message += '\n';
    message += "follow redirects: ";
    message += args[1].As<Napi::String>();
    message += '\n';

    std::cerr << message << std::endl;
    // Throw a javascript-side exception
    Napi::TypeError::New(env, message).ThrowAsJavaScriptException();

    // Clear the old string
    url.clear();

    message.clear();

    // Return null
    return env.Null();
  }

  // If the request did not cause an exception,
  // return the status and exit.
  return Napi::Number::New(env, status);
}

Napi::Value Post(const Napi::CallbackInfo& args) {

  const Napi::Env env = args.Env();

  // Arguments required: at least one, and no more than two
  if (args.Length() != 2) {
    // NAPI_CPP_EXCEPTIONS = YES
    Napi::TypeError::New(env, "Wrong number of arguments! Please supply a url string, and the string data to POST, in that order").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Param 1 must be a url string
  // Param 2 must be a data string
  if (!args[0].IsString() || !args[1].IsString()) {
    // NAPI_CPP_EXCEPTIONS = YES
    Napi::TypeError::New(env, "Wrong type of arguments! Please supply a url string, and the string data to POST, in that order").ThrowAsJavaScriptException();
    return env.Null();
  }

  /* First set the URL that is about to receive our POST. This URL can just as well be an https:// URL if that is what should receive the data. */
  std::string url = args[0].ToString().Utf8Value();

  /* Now specify the POST data */
  std::string data = args[1].ToString().Utf8Value();

  int status;

  try {

    // Try to post the data to the url
    status = hello_addon_post(url.data(), data.data());

    NAPI_THROW_IF_FAILED(env, status) // This behaviour changes depending on EXCEPTIONS policy (can be YES, NO, or MAYBE)

  } catch (const std::exception &x) {

    // If there was an error...
    std::string message(x.what());
    message += '\n';
    message += STRINGIFY(CMAKEJS_ADDON_NAME)".node: could not post the following request:\n";
    message += "url: ";
    message += args[0].As<Napi::String>();
    message += '\n';
    message += "data: ";
    message += args[1].As<Napi::String>();
    message += '\n';
    // Throw a javascript-side exception
    Napi::TypeError::New(env, message).ThrowAsJavaScriptException();

    // Clear the old string
    url.clear();

    message.clear();

    // Return null
    return env.Null();
  }

  // If the request did not cause an exception,
  // return the status and exit.
  return Napi::Number::New(env, status);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {

  // Export a chosen C++ function under a given Javascript key
  exports.Set(
    Napi::String::New(env, "hello"), // Name of function on Javascript side...
    Napi::Function::New(env, Hello)  // Name of function on C++ side...
  );

  exports.Set(
    Napi::String::New(env, "napi_version"),
    Napi::Function::New(env, NapiVersion)
  );

  exports.Set(
    Napi::String::New(env, "curl_version"),
    Napi::Function::New(env, CurlVersion)
  );

  exports.Set(
    Napi::String::New(env, "get"),
    Napi::Function::New(env, Get)
  );

  exports.Set(
    Napi::String::New(env, "post"),
    Napi::Function::New(env, Post)
  );

  // The above will expose the C++ function 'Hello' as a javascript function
  // named 'hello', etc...
  return exports;
}

// Register a new addon with the intializer function defined above
NODE_API_MODULE(CMAKEJS_ADDON_NAME, Init) // (name to use, initializer to use)

#ifdef NAPI_CPP_CUSTOM_NAMESPACE
}  // namespace NAPI_CPP_CUSTOM_NAMESPACE
#endif
} // namespace Napi

// Export your custom namespace to outside of the Napi namespace, providing an
// alias to the Napi Addon API; e.g., '<vendor>::<addon>::Object()', along with the
// functions defined above, such as '<vendor>::<addon>::Hello()'.
namespace NAPI_CPP_CUSTOM_NAMESPACE::CMAKEJS_ADDON_NAME {
  using namespace Napi::NAPI_CPP_CUSTOM_NAMESPACE;
}

#else // !__has_include(<napi.h>) || !BUILDING_NODE_EXTENSION
 #warning "Warning: Cannot find '<napi.h>' - try running 'npm -g install cmake-js'..."
#endif
