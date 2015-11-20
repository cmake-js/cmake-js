var yargs = require("yargs")
    .options({
        old: {
            demand: false,
            type: "boolean"
        }
    });
var argv = yargs.argv;

var es6;

if (argv.old) {
    es6 = false;
}
else {
    es6 = true;
    try {
        eval("(function *(){})");
    } catch (err) {
        es6 = false;
    }
}

if (!es6) {
    require("traceur/bin/traceur-runtime");
}

require(es6 ? "./es6" : "./es5");