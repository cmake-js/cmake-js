/**
 *
*/

#ifndef HELLO_ADDON_H_INCLUDED
#define HELLO_ADDON_H_INCLUDED

#include <iostream>

#include <curl/curl.h>

int hello_addon_post(const char *url, const char *data);

#endif // HELLO_ADDON_H_INCLUDED
