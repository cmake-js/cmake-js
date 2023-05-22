"use strict";
const path = require("path");

const locateNodeApi = module.exports = async function (projectRoot) {
    if (locateNodeApi.__projectRoot) {
        // Override for unit tests
        projectRoot = locateNodeApi.__projectRoot;
    }

    try {
        let requirePath = require("node-addon-api").include
        requirePath = requirePath.replace(/"/g, '');
        return requirePath;
    } catch (e) {
        // It most likely wasn't found
        return null;
    }
};
