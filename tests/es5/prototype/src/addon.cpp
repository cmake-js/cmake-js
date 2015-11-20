// addon.cc
#include <node.h>
#include <nan.h>

NAN_METHOD(Add) {
  double value = info[0]->NumberValue() + info[1]->NumberValue();
  info.GetReturnValue().Set(Nan::New(value));
}

NAN_MODULE_INIT(Init) {
  Nan::Set(target, Nan::New("add").ToLocalChecked(), Nan::GetFunction(Nan::New<v8::FunctionTemplate>(Add)).ToLocalChecked());
}

NODE_MODULE(addon, Init)