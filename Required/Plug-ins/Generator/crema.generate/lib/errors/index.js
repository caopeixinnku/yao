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

// TODO: Merge this file with PSPlugin/errors.js.
(function () {
    "use strict";

    var Locale = require("locale"),
        StringUtils = require("shared/StringUtils"),
        util = require("util");

    var UserFacingError = function (message) {
        this.message = message;
    };
    util.inherits(UserFacingError, Error);

    var EmptySelectionError = function () {
        this.message = Locale.EMPTY_SELECTION_ERROR;
    };

    var FSWriteError = function (directory) {
        this.message = StringUtils.formatStr(Locale.FS_WRITE_ERROR, directory);
    };

    util.inherits(EmptySelectionError, UserFacingError);
    util.inherits(FSWriteError, UserFacingError);

    module.exports.UserFacingError = UserFacingError;
    module.exports.EmptySelectionError = EmptySelectionError;
    module.exports.FSWriteError = FSWriteError;
}());
