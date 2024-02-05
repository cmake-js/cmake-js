function test_post() {

  let status = false;

  try {

    const addon = require("../../lib/addon.node");

    addon.post('https://httpbin.org/anything', 'name=nathanjhood&project=cmake-js');

    status = true;

  } catch(e) {

    console.log(`${e}`);
  }

  return status;
};

const res_test_post = test_post();

if((!res_test_post))
{
  console.log("'test_post()' failed.");
  return false;
}

console.log("'test_post()' passed.");
return true;
