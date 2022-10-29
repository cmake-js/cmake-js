#include <napi.h>

Napi::Value Mul(const Napi::CallbackInfo &info)
{
  double value = info[0].As<Napi::Number>().DoubleValue() * info[1].As<Napi::Number>().DoubleValue();
  return Napi::Number::New(info.Env(), value);
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("mul", Napi::Function::New(env, Mul));
}

NODE_API_MODULE(addon_napi, Init)
