var gulp = require("gulp");
var traceur = require("gulp-traceur");
var gulpSequence = require("gulp-sequence");
var exec = require("child_process").exec;
var sourcemaps = require("gulp-sourcemaps");

gulp.task("compile-test", function () {
    return gulp.src("tests/es6/**/*.js", {base: "tests/es6"})
        .pipe(sourcemaps.init())
        .pipe(traceur())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest("tests/es5"));
});

gulp.task("compile-lib", function () {
    return gulp.src("lib/es6/**/*.js", {base: "lib/es6"})
        .pipe(sourcemaps.init())
        .pipe(traceur())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest("lib/es5"));
});

gulp.task("compile", gulpSequence(["compile-test", "compile-lib"]));

gulp.task("default", gulpSequence("compile"));

gulp.task("npm-publish", function (done) {
    exec("npm publish").on("close", function(e) {
        if (e) {
            done(new Error("Cannot publish to the npm. Exit code: " + e + "."));
        }
        else {
            done();
        }
    });
});

gulp.task("publish", gulpSequence("compile", "npm-publish"));