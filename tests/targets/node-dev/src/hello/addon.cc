/**
 * @file addon.cc
 * @brief A quick 'hello world' Node Addon in C++
*/

// Required header
#if __has_include(<node.h>)

#include <node.h>

namespace vendor {

void Hello(const v8::FunctionCallbackInfo<v8::Value>& args)
{
  v8::Isolate* isolate = args.GetIsolate();
  args.GetReturnValue().Set(v8::String::NewFromUtf8(isolate, "addon.node is online!").ToLocalChecked());
}

// void Version(const v8::FunctionCallbackInfo<v8::Value>& args)
// {
//   v8::Isolate* isolate = args.GetIsolate();
//   args.GetReturnValue().Set(NODE_VERSION); // should be a v8::Number...
// }

// Expose the C++ function 'Hello' as a javascript function named 'hello', etc...
void Initialize(v8::Local<v8::Object> exports)
{
  // Export a chosen C++ function under a given Javascript key
  NODE_SET_METHOD(exports,
    "hello", // Name of function on Javascript side...
    Hello    // Name of function on C++ side...
  );

  // NODE_SET_METHOD(exports,
  //   "version",
  //   Version
  // );
}

// Register a new addon with the intializer function defined above
NODE_MODULE(addon, Initialize) // (name to use, initializer to use)

} // namespace vendor

#else // !__has_include(<node.h>)
 #warning "Warning: Cannot find '<node.h>' - try running 'npm -g install cmake-js'..."
#endif
