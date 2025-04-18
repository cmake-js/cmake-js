declare interface addon {
  hello(): string;
  version(): string;
}
declare const addon: addon;
export = addon;
