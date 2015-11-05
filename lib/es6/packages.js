"use strict";
let Bluebird = require("bluebird");
let async = Bluebird.coroutine;
let _ = require("lodash");

let packages = {
    defs: {
        make: {
            version: "3.81.0",
            files: [
                {
                    path: "http://downloads.sourceforge.net/project/gnuwin32/make/3.81/make-3.81-bin.zip?r=http%3A%2F%2Fgnuwin32.sourceforge.net%2Fpackages%2Fmake.htm&ts=1446755915",
                    md5: "3521948bc27a31d1ade0dcb23be16d49"
                },
                {
                    path: "http://downloads.sourceforge.net/project/gnuwin32/make/3.81/make-3.81-dep.zip?r=http%3A%2F%2Fgnuwin32.sourceforge.net%2Fpackages%2Fmake.htm&ts=1446755974&use_mirror=netix",
                    md5: "d370415aa924fa023411c4099ef84563"
                }
            ]
        },
        gppX64: {},
        gppX86: {}
    },
    install: async(function*(def) {
    }),
    installMake: function() {
        return this._install(this.defs.make);
    },
    installGPPX86: function() {
        return this._install(this.defs.gppX86);
    },
    installGPPX64: function() {
        return this._install(this.defs.gppX64);
    }
};

module.exports = packages;