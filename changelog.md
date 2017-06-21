v3.5.0 - 06/21/17
=================

- Added Visual Studio 2017 compatibility: https://github.com/cmake-js/cmake-js/pull/78

v3.4.1 - 02/4/17
=================

- FIX: test output instead of guessing by platform: https://github.com/cmake-js/cmake-js/pull/77

v3.4.0 - 01/12/17
=================

- "G" option to set custom generators: https://github.com/cmake-js/cmake-js/pull/64

v3.3.1 - 09/13/16
=================

- fix of default parameters: https://github.com/cmake-js/cmake-js/pull/57

v3.3.0 - 09/02/16
=================

- silent option (https://github.com/cmake-js/cmake-js/pull/54)
- out option (https://github.com/cmake-js/cmake-js/pull/53)

v3.2.3 - 08/17/16
=================

- Line endings

v3.2.2 - 12/08/16
=================

- Multi directory support for Windows/MSVC build

v3.2.1 - 25/04/16
=================

- Linux line ending hotfix

v3.2.0 - 25/04/16
=================

- Added NW.js 0.13+ compatibility
- Node v0.10.x support fixed (https://github.com/cmake-js/cmake-js/pull/45, https://github.com/cmake-js/cmake-js/issues/50)
- CMAKE_JS_VERSION defined (https://github.com/cmake-js/cmake-js/issues/48)

v3.1.2 - 03/02/16
=================

- Fixed cmake-js binary ES5 compatibility.

v3.1.1 - 03/02/16
=================

- Fixed line endings

v3.1.0 - 03/02/16
=================

- Custom CMake parameter support (https://github.com/gerhardberger)

v3.0.0 - 20/11/15
=================

- Visual C++ Build Tools support
- std option introduced
- better unit test coverage

v2.1.0 - 29/10/15
=================

- explicit options for use GNU or Clang compiler instead of CMake's default (see --help for details)

v2.0.2 - 22/10/15
=================

- Fix: print-* commands report "undefined"

v2.0.0 - 17/10/15
=================

- Fix: distribution files only gets downloaded if needed (4.0.0+)
- option to generate Xcode project (-x, --prefer-xcode) - by https://github.com/javedulu
- compile command for fast module compilation during npm updates (instead of rebuild)
- codebase switched to ECMAScript 2015

v1.1.1 - 06/10/15
=================

- Hotfix for build NW.js correctly.

v1.1.0 - 05/10/15
=================

- Node.js 4.0.0+ support
- Downloads the small, header only tarball for Node.js 4+
