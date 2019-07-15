/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright (c) 2015 Adobe Systems Incorporated. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true, node: true */


(function () {
    "use strict";
    var Path = require("path");

    var JSXRunner = function (generator) {
        this._generator = generator;
        //we should always be starting a directory above lib, so go back two directories
        this._jsxPath = Path.resolve(__dirname, "..", "..", "JSX");
    };

    JSXRunner.prototype.executeJSX = function(path, params) {
        path = Path.resolve(this._jsxPath, path + ".jsx");
        //the jsxrunner in crema returns the result as a string
        return this._generator.evaluateJSXFile(path, params).then(function(data) {
            return JSON.stringify(data);
        });
    };

    module.exports = JSXRunner;
})();
