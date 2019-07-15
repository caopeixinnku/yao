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

    var FS = require("fs"),
        Path = require("path"),
        PathUtils = require("shared/PathUtils"),
        StringUtils = require("shared/StringUtils");

    var PSDialogs = function (generator) {
        this._generator = generator;
    };

    /**
     * @param {String} message
     * @return {Promise}
     */
    PSDialogs.prototype.alert = function (message) {
        var escapedMessage = StringUtils.escapeForCodeContext(message),
            windowsOnlyTitle = " "; // Prevents the alert from having a title of "Script Alert" on Windows.

        return this._generator
            .evaluateJSXString('alert("' + escapedMessage + '", "' + windowsOnlyTitle + '");');
    };

    /**
     * @param {String} folder
     * @param {String} basename
     * @param {String} ext Does not include dot.
     * @return {Promise} Resolved with the selected file path or rejected with an error with a message of "cancel".
     */
    PSDialogs.prototype.promptForFile = function (folder, basename, ext) {
        var initialFilePath = PathUtils.buildPath(folder, basename, ext),
            escapedInitialFilePath = StringUtils.escapeForCodeContext(initialFilePath);

        return this._generator
            .evaluateJSXString('var fileObj = File("' + escapedInitialFilePath + '").saveDlg(); fileObj ? fileObj.fsName : "";')
            .then(function (selectedFilePath) {
                if (!selectedFilePath) {
                    throw new Error("cancel");
                }

                selectedFilePath = this._resolveSelectedPath(selectedFilePath);
                selectedFilePath = PathUtils.addExtIfNeededWithoutCausingConflicts(selectedFilePath, ext);

                return selectedFilePath;
            }.bind(this));
    };

    /**
     * @param {String} folder
     * @return {Promise} Resolved with the selected folder path or rejected with an error with a message of "cancel".
     */
    PSDialogs.prototype.promptForFolder = function (folder) {
        var escapedInitialFolder = StringUtils.escapeForCodeContext(folder);

        return this._generator
            .evaluateJSXString('var folderObj = Folder("' + escapedInitialFolder + '").selectDlg(); folderObj ? folderObj.fsName : "";')
            .then(function (selectedFolder) {
                if (!selectedFolder) {
                    throw new Error("cancel");
                }
                return this._resolveSelectedPath(selectedFolder);
            }.bind(this));
    };


    PSDialogs.prototype._resolveSelectedPath = function (path) {
        // The JSX call returns a URI encoded path and may contain an initial tilde.
        path = PathUtils.resolveInitialTilde(path);
        return path;
    };

    module.exports = PSDialogs;
}());
