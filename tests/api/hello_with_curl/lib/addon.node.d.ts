declare interface addon {
  hello(): string;
  napi_version(): number;
  curl_version(): number;
  post(): string;
}
declare const addon: addon;
export = addon;
