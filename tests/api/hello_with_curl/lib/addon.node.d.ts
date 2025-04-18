declare interface addon {
  hello(): string;
  napi_version(): number;
  curl_version(): number;
  get(url: string, follow: boolean): string;
  post(url: string, data: string): string;
}
declare const addon: addon;
export = addon;
