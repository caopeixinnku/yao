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
/*global define: false, require: false, module: false */

"use strict";

module.exports = function(inputVal, decPlaces) {
    // Round (not truncate) inputVal to specfied number of decimal places
    if (decPlaces === undefined || decPlaces < 0) {
        // safety check
        return inputVal;
    }

    var multiplier = Math.pow(10, decPlaces),
        outputVal = Math.round(multiplier * inputVal) / multiplier;

    return outputVal;
};