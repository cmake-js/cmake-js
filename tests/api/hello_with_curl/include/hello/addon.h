/**
 *
*/

#ifndef HELLO_ADDON_H_INCLUDED
#define HELLO_ADDON_H_INCLUDED

#include <iostream>

#include <curl/curl.h>

#define HELLO_ADDON_VERSION @PROJECT_VERSION@ // CMake will evaluate this when 'configure_file()' runs!

/** Adapted from https://curl.se/libcurl/c/simple.html */
int hello_addon_get(const char* url, const bool& follow);

/** Adapted from https://curl.se/libcurl/c/http-post.html */
int hello_addon_post(const char* url, const char* data);

#endif // HELLO_ADDON_H_INCLUDED
