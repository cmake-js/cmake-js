/**
 *
*/

#ifndef HELLO_ADDON_H_INCLUDED
#define HELLO_ADDON_H_INCLUDED

#include <iostream>

#include <curl/curl.h>

/**
 * @brief Adapted from https://curl.se/libcurl/c/simple.html
 *
 * @param url The HTTP URL to send the POST request to.
 * @param follow Whether to follow redirected URL requests.
 * @return int
 */
int hello_addon_get(const char* url, const bool& follow);

/**
 * @brief Adapted from https://curl.se/libcurl/c/http-post.html
 *
 * @param url The HTTP URL to send the POST request to.
 * @param data The data body to send in the POST request.
 * @return int
 */
int hello_addon_post(const char *url, const char *data);

#endif // HELLO_ADDON_H_INCLUDED
