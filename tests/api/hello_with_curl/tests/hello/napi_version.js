function test_napi_version() {

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

const res_test_napi_version = test_napi_version();

if((!res_test_napi_version))
{
  console.log("'test_napi_version()' failed.");
  return false;
}

console.log("'test_napi_version()' passed.");
return true;
