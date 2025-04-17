/**
 * @file addon.cc
 * @brief A quick 'hello world' Node Addon in C++
 */

// Required header
#if __has_include(<nan.h>)

#include <node.h>
#include <nan.h>
namespace vendor
{

  NAN_METHOD(Hello)
  {
    info.GetReturnValue().Set(Nan::New("addon.node is online!"));
  }

  // Expose the C++ function 'Hello' as a javascript function named 'hello', etc...
  NAN_MODULE_INIT(Initialize)
  {
    Nan::Set(target, Nan::New("hello").ToLocalChecked(), Nan::GetFunction(Nan::New<v8::FunctionTemplate>(Hello)).ToLocalChecked());
  }

  // Register a new addon with the intializer function defined above
  NODE_MODULE(addon, Initialize) // (name to use, initializer to use)

} // namespace vendor

#else // !__has_include(<nan.h>)
#warning "Warning: Cannot find '<nan.h>' - try running 'npm -g install cmake-js'..."
#endif
