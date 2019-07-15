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
/*global require, module */

(function () {
    "use strict";

    var _ = require("underscore"),
        FS = require("fs"),
        Path = require("path");

    var Locale = function () {};

    Locale.prototype.init = function (locale) {
        var localeStrings = this._loadLocaleStrings(locale);
        if (!localeStrings) {
            // Fall back to en_US when locale isn't found.
            localeStrings = this._loadLocaleStrings("en_US");
        }

        if (!localeStrings) {
            console.error("Failed to load fallback locale.");
            return;
        }

        _(this).assign(localeStrings);
    };

    Locale.prototype._loadLocaleStrings = function (locale) {
        try {
            var localeRelativePath = (locale == "en_US" ? "messages.properties" : Path.join(locale, "Messages.properties")),
                localeAbsolutePath = Path.resolve(__dirname, localeRelativePath),
                localeFileContents = FS.readFileSync(localeAbsolutePath, "utf8");
            return this._parseLocaleStrings(localeFileContents);
        } catch (e) {
            console.error("Failed to load locale:", locale);
            return null;
        }
    };

    Locale.prototype._parseLocaleStrings = function (localeFileContents) {
        var lines = localeFileContents.split("\n"),
            localeStrings = {};

        lines.forEach(function (line) {
            if (!line) {
                // Ignore empty lines.
                return;
            }

            // Parse lines like "SELECT_ALL = Select All". In other words, match non-whitespace, then whitespace,
            // then =, then whitespace, then any characters to the end of the line.
            var parts = line.match(/(\S*)\s*=\s*(.*)/),
                stringKey = parts && parts[1],
                stringValue = parts && parts[2];

            if (!stringKey || !stringValue) {
                console.error("Failed to parse locale string:", line);
                return;
            }

            localeStrings[stringKey] = stringValue;
        });

        return localeStrings;
    };

    module.exports = new Locale();
}());
