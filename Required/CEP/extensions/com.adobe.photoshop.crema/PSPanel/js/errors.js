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

// TODO: Merge this file with generator/lib/errors.js.
(function () {
    "use strict";

    var Strings = require("./LocStrings"),
        util = require("util");

    var UserFacingError = function (message) {
        this.message = message;
    };
    util.inherits(UserFacingError, Error);

    var UserFacingErrorNotFixable = function (message) {
        this.message = message;
    };
    util.inherits(UserFacingErrorNotFixable, Error);

    var EmptySelectionError = function () {
        this.message = Strings.EMPTY_SELECTION_ERROR;
    };

    var FSWriteError = function (directory) {
        this.message = Strings.formatStr(Strings.FS_WRITE_ERROR, directory);
    };

    var MetadataError = function () {
        this.message = Strings.METADATA_ERROR;
    };

    util.inherits(EmptySelectionError, UserFacingError);
    util.inherits(FSWriteError, UserFacingError);
    util.inherits(MetadataError, UserFacingErrorNotFixable);

    module.exports.UserFacingError = UserFacingError;
    module.exports.UserFacingErrorNotFixable = UserFacingErrorNotFixable;
    module.exports.EmptySelectionError = EmptySelectionError;
    module.exports.FSWriteError = FSWriteError;
    module.exports.MetadataError = MetadataError;
}());
