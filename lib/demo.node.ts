/**
 * The 'demo' C++ addon interface.
 */
interface demo {
  /**
   * Returns a string, confirming the cmake-js demo is online.
   * @returns string
   */
  hello(): string;
  /**
   * Returns a number, confirming the Napi Addon API version number.
   * @returns number
   */
  version(): number;
}
const demo: demo = require('../build/lib/demo.node');
export = demo;
