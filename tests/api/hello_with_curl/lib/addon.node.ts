/**
 * The 'addon' C++ addon interface.
 */
interface addon {
  /**
   * Returns a string, confirming the cmake-js addon is online.
   * @returns string
   */
  hello(): string;
  /**
   * Returns a number, confirming the Napi Addon API version number.
   * @returns number
   */
  napi_version(): number;
  /**
   * Returns a number, confirming the Curl API version number.
   * @returns number
   */
  curl_version(): number;
  /**
   * Sends an HTTP POST request using the CURL API.
   * The request is sent to 'url'. Both the url and the
   * data to be posted must be Javascript strings (for now).
   * Returns a number, confirming the POST request status.
   * @returns number
   */
  get(url: string, follow: boolean): number;
  /**
   * Sends an HTTP POST request using the CURL API.
   * The request is sent to 'url'. Both the url and the
   * data to be posted must be Javascript strings (for now).
   * Returns a number, confirming the POST request status.
   * @returns number
   */
  post(url: string, data: string): number;
}
const addon: addon = require('../build/lib/addon.node');
export = addon;
