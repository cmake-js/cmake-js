/**
 * @file post.cpp
 * @brief A quick 'HTTP POST' Napi Addon in C++ with CURL
*/

#include <iostream>

#if __has_include(<curl/curl.h>)

#include <curl/curl.h>

#include "hello/addon.h"

/**
 * @brief Adapted from https://curl.se/libcurl/c/simple.html
 *
 * @param url The HTTP URL to send the POST request to.
 * @param follow Whether to follow redirected URL requests.
 * @return int
 */
int hello_addon_get(const char* url, const bool& follow)
{
  CURL *curl;
  CURLcode res;

  std::cout << "\n";
  std::cout << "Using cURL v" << CURLVERSION_NOW << std::endl;
  std::cout << "\n";

  std::cout << "\n";
  std::cout << "url: " << url << std::endl;
  std::cout << "follow redirects: " << follow << std::endl;
  std::cout << "\n";

  curl = curl_easy_init();
  if(curl) {
    curl_easy_setopt(curl, CURLOPT_URL, url);
    /* example.com is redirected, so we tell libcurl to follow redirection */
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L); // 'follow'

    /* Perform the request, res will get the return code */
    res = curl_easy_perform(curl);
    /* Check for errors */
    if(res != CURLE_OK)
      fprintf(stderr, "curl_easy_perform() failed: %s\n", curl_easy_strerror(res));

    /* always cleanup */
    curl_easy_cleanup(curl);
  }
  return EXIT_SUCCESS;
}

#else // !__has_include(<curl/curl.h>)
 #warning "Warning: Cannot find '<curl/curl.h>' - try installing cURL from your command line'..."
#endif
