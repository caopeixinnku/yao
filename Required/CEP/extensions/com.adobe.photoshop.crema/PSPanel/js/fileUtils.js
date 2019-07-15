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

/*jslint vars: true, node: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true */
"use strict";

var Q               = require("q"),
    Path            = require("path"),
    Exec            = require("child_process").exec;

var openFolderInOS = function (isWin, destFolder) {
    var command = "";

    destFolder = Path.normalize(destFolder);

    if (isWin) {
        command = "explorer /root," + destFolder;
    } else {
        command = "open '" + destFolder + "'";
    }
    return Q.nfcall(Exec, command);
};

module.exports.openFolderInOS = openFolderInOS;