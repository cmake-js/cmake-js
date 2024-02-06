function test_curl_version() {

  let status = false;

  try {

    const addon = require("../../lib/addon.node");

    console.log(`Napi Version: ${addon.napi_version()}`);

    status = true;

  } catch(e) {

    console.log(`${e}`);
  }

  return status;
};

const res_test_curl_version = test_curl_version();

if((!res_test_curl_version))
{
  console.log("'test_curl_version()' failed.");
  return false;
}

console.log("'test_curl_version()' passed.");
return true;
