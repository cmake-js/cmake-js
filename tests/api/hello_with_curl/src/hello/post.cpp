/**
 * @file post.cpp
 * @brief A quick 'HTTP POST' Napi Addon in C++ with CURL
*/

#include <iostream>

#if __has_include(<curl/curl.h>)

#include <curl/curl.h>

#include "hello/addon.h"

int hello_addon_post(const char* url, const char* data)
{
  CURL *curl;
  CURLcode res;

  std::cout << "\n";
  std::cout << "Using cURL v" << CURLVERSION_NOW << std::endl;
  std::cout << "\n";

  std::cout << "\n";
  std::cout << "url: " << url << std::endl;
  std::cout << "data: " << data << std::endl;
  std::cout << "\n";

  /* In windows, this will init the winsock stuff */
  curl_global_init(CURL_GLOBAL_ALL);

  /* get a curl handle */
  curl = curl_easy_init();
  if(curl) {
    /* First set the URL that is about to receive our POST. This URL can just as well be an https:// URL if that is what should receive the data. */
    curl_easy_setopt(curl, CURLOPT_URL, url);
    /* Now specify the POST data */
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data);

    /* Perform the request, res will get the return code */
    res = curl_easy_perform(curl);
    /* Check for errors */
    if(res != CURLE_OK) fprintf(stderr, "curl_easy_perform() failed: %s\n", curl_easy_strerror(res));

    /* always cleanup */
    curl_easy_cleanup(curl);
  }
  curl_global_cleanup();
  return EXIT_SUCCESS;
}

#else // !__has_include(<curl/curl.h>)
 #warning "Warning: Cannot find '<curl/curl.h>' - try installing cURL from your command line'..."
#endif
