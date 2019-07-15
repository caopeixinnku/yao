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

var StringUtils = require("shared/StringUtils"),
    CremaGlobal = require("../cremaGlobal.js");

var formatBytesToLabel = function (bytes) {
    if (!bytes) {
        return "";
    }
    if (bytes < 1e3) {
        return module.exports.formatStr(module.exports.SIZE_BYTES, bytes);
    }
    if (bytes < 1e6) {
        return module.exports.formatStr(module.exports.SIZE_KILOBYTES, Math.round(bytes / 1e2) / 10);
    }
    return module.exports.formatStr(module.exports.SIZE_MEGABYTES, Math.round(bytes / 1e5) / 10);
};

module.exports = CremaGlobal.localeStrings || {};
module.exports.formatStr = StringUtils.formatStr;
module.exports.formatBytesToLabel = formatBytesToLabel;