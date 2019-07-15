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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, node: true */

(function () {
    "use strict";

    var Q = require("q"),
        JSXRunner = require("./JSXRunner"),
        StringUtils = require("shared/StringUtils");

    var PSAlerts = function () {};

    PSAlerts.prototype.alert = function (message) {
        var deferred = Q.defer(),
            escapedMessage = StringUtils.escapeForCodeContext(message);
        JSXRunner.runJSX("alert", escapedMessage, deferred.resolve);
        return deferred.promise;
    };

    module.exports = new PSAlerts();
}());
