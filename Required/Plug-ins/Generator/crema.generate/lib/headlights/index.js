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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true */

(function () {
    "use strict";

    var _    = require("underscore"),
        Path = require("path"),
        StringUtils = require("shared/StringUtils");
        
    var Headlights = function (generator) {
        this._generator = generator;
        _.extend(this, require("shared/HeadlightsStrings"));
    };

    var jsxLogHLFilePath = Path.resolve(__dirname, "./jsx/logHeadlights.jsx"),
        jsxLogHLDataGroupFilePath = Path.resolve(__dirname, "./jsx/logHeadlightsDataGroup.jsx"),
        keys = [],
        vals = [];

    // log a single event in headlights
    Headlights.prototype.logEvent = function (subCategStr, eventStr) {
//        console.log("Headlights.logEvent(%s, %s)", subCategStr, eventStr);
        return this._generator.evaluateJSXFile(jsxLogHLFilePath, {subcategory: subCategStr, event: eventStr});
    };

    // accumulate a key/val pair to log later
    Headlights.prototype.accumulateData = function (keyStr, valStr) {
        //console.log("accum: %s\t%s\n", keyStr, valStr);
        keys.push(keyStr);
        vals.push(valStr);
    };

    // log all thekey/val pairs we accumulated
    Headlights.prototype.logAccumulatedData = function (groupName) {
//        console.log("headlights logAccumulatedData " + groupName);
//        keys.forEach(function (value, index) {
//            console.log("\t" + value + ": " + vals[index]);
//        });
        this._generator.evaluateJSXFile(jsxLogHLDataGroupFilePath, {groupName: groupName, key: keys, val: vals});
        keys = [];
        vals = [];
    };
    
    // log a single piece of data in headlights
    // Replace comma with "&#44" so it isn't mis-interpreted by the jsx script.
    Headlights.prototype.logData = function (groupName, keyStr, valStr) {
        //console.log("headlights logData %s %s %s", groupName, keyStr, valStr);    
        var promise = this._generator.evaluateJSXFile(jsxLogHLDataGroupFilePath, {groupName: groupName, key: keyStr, val: StringUtils.encodeCommas(valStr)});
        promise.then(function(data) {
          //  console.log(data);
        });
    };
    
    // NOTE: The list of headlights event strings is now in shared/HeadlightsStrings/index.js

    module.exports = Headlights;
}());

