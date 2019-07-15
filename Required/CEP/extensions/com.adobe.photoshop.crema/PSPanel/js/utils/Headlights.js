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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, node: true */
/*global define: true*/

"use strict";

var _           = require("underscore"),
    CremaGlobal = require("../cremaGlobal.js"),
    JSXRunner   = require("../JSXRunner"),
    StringUtils = require("shared/StringUtils"),
    keys = [],
    vals = [];

// log a single event in headlights
var logEvent = function (subCategStr, eventStr) {
    CremaGlobal.window.console.log("headlights logEvent %s %s", subCategStr, eventStr);
    JSXRunner.runJSX("logHeadlights", subCategStr, eventStr);
};

// log a single piece of data in headlights
// Replace comma with "&#44" so it isn't mis-interpreted by the jsx script.
var logData = function (groupName, keyStr, valStr) {
    CremaGlobal.window.console.log("headlights logData %s %s %s", groupName, keyStr, valStr);
    JSXRunner.runJSX("logHeadlightsDataGroup", groupName, keyStr, StringUtils.encodeCommas(valStr));
};

// accumulate a key/val pair to log later
var accumulateData = function (keyStr, valStr) {
//    CremaGlobal.window.console.log("accum: %s\t%s\n", keyStr, valStr);
    keys.push(keyStr);
    vals.push(StringUtils.encodeCommas(valStr));
};

// log all thekey/val pairs we accumulated
var logAccumulatedData = function (groupName) {
//    CremaGlobal.window.console.log("headlights logAccumulatedData " + groupName);
//    keys.forEach(function (value, index) {
//        CremaGlobal.window.console.log("\t" + value + ": " + vals[index]);
//    });
    JSXRunner.runJSX("logHeadlightsDataGroup", groupName, keys, vals);
    keys = [];
    vals = [];
};

// NOTE: The list of headlights event strings is now in shared/HeadlightsStrings/index.js

_.extend(exports, require("shared/HeadlightsStrings"));


// FUNCTIONS
exports.logEvent = logEvent;
exports.logData = logData;
exports.accumulateData = accumulateData;
exports.logAccumulatedData = logAccumulatedData;
