/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
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
"use strict";

//since it is basically just a text loader, we can use this to load jsx
var templateLoader = require("../TemplateLoader"),
    _   = require("underscore"),
    CremaGlobal = require("../cremaGlobal.js"),
    Q = require("q"),
    jsxPath = "../JSX/",
    fileExtension = ".jsx";


var stringifyParams = function (params) {
    var paramsString = "null";
    if (params) {
        try {
            paramsString = JSON.stringify(params);
        } catch (jsonError) {
            CremaGlobal.window.console.error(jsonError);
        }
    }
    return paramsString;
};


exports.getRawJSX = function (fileName) {
    var jsxFile,
        args = Array.prototype.slice.call(arguments, 1),
        jsxToRun;

    if (_.endsWith(fileName, fileExtension)) {
        fileName = fileName.replace(fileExtension, "");
    }

    if (typeof (args[args.length - 1]) === 'function') {
        args.pop();
    }

    jsxFile = templateLoader.loadTemplate(jsxPath + fileName + fileExtension);
    if (!jsxFile) {
        CremaGlobal.window.console.warn("No jsxfile found " + fileName);
        return "";
    }
    args.unshift(jsxFile);
    jsxToRun = _.sprintf.apply(_, args);
    return jsxToRun;
};

exports.runRawJSX = function (jsxToRun, callback) {
    if (CremaGlobal.csInterface) {
        CremaGlobal.csInterface.evalScript(jsxToRun, callback);
    }
};

exports.runJSX = function (action, rightNow) {
    var jsxToRun,
        args = Array.prototype.slice.call(arguments, 1),
        callback;

    if (typeof (args[args.length - 1]) === 'function') {
        callback = args.pop();
    } else {
        callback = function () {};
    }

    jsxToRun = exports.getRawJSX.apply(exports, arguments);

    if (rightNow) {
        exports.runRawJSX(jsxToRun, callback);
    } else {
        _.defer(function () { exports.runRawJSX(jsxToRun, callback); });
    }
};

//is just like the above, except uses a promise and params ala generator
exports.executeJSX = function (path, params) {
    var stringParams =  "var params = " + stringifyParams(params)  + ";\n",
        jsxToRun = exports.getRawJSX.apply(exports, [path]);

    return Q.Promise(function(resolve, reject, notify) {
        exports.runRawJSX(stringParams + jsxToRun, function(data) {
            if(data.indexOf("EvalScript error.") > -1) {
                reject(data);
            }
            resolve(data);
        });
    }).timeout(5000);
};

