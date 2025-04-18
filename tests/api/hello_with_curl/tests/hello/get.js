function test_get() {

  let status = false;

  try {

    const addon = require("../../lib/addon.node");

    addon.get('https://httpbin.org/anything', /** follow redirects? */ true);

    status = true;

  } catch(e) {

    console.log(`${e}`);
  }

  return status;
};

const res_test_get = test_get();

if((!res_test_get))
{
  console.log("'test_get()' failed.");
  return false;
}

console.log("'test_get()' passed.");
return true;
