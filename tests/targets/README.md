# CMakeJS.cmake targets

The four directories here correspond to the four CMake targets we currently export:

| dir            | target                   | provides                        | link level  |
| -------------- | ------------------------ | ------------------------------- | ----------- |
| node-dev       | cmake-js::node-dev       | \<node.h\>                      | 0           |
| node-api       | cmake-js::node-api       | \<node_api.h\>                  | 1           |
| node-addon-api | cmake-js::node-addon-api | \<napi.h\>                      | 2           |
| cmake-js       | cmake-js::cmake-js       | cmakejs_create_napi_addon()     | 3 (default) |

Each target in the above order *depends on* the one before it; they have also all been made relocatable.

The first three targets, cmake-js::node-*, each carries it's own set of headers, as indicated by their given names, and further clarified in the table above.

Our proposed ```--link-level``` CLI switch can control how far down the list they want to go. User who specify a ```--link-level=1``` on their cmake-js CLI command(s) will handily find that they are automatically linked with and provided the header sets provided by cmake-js::node-api (the C addon headers), *as well as* cmake-js::node-dev (which the C headers depend on). What they won't recieve or be linked with is any of the header set from cmake-js::node-addon-api (the C++ Addon wrappers). This is [desireable behaviour]().

cmake-js::cmake-js is unique in that it doesn't carry any headers of it's own, but since it *does* carry all the other targets by being last in the consumer chain, users linking to this target will recieve the full set of developer headers, *and* will be able to use our very nice ```cmakejs_create_napi_addon()``` function in their CMakeLists.txt, which vastly reduces the amount of intermediate/advanced CMake config they might otherwise be faced with.

Everything is powered by a tidy combination of cmake-js' Javascript CLI and it's CMake API.

As a cherry on the cake, users will be able to call CPack on their addons, and find that their CMake source and binary dirs are bundled up along with the header sets that they requested via ```--link-level``` (and nothing more).
