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

/*jslint vars: true, node: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true */
"use strict";

var Q = require("q"),
    Strings = require("./LocStrings"),
    fs = require("fs"),
    Path = require("path"),
    PathUtils = require("shared/PathUtils"),
    StringUtils = require("shared/StringUtils"),
    CremaGlobal = require("./cremaGlobal.js");

var pathExists = function (path) {
    return fs.existsSync(path);
};

/**
 * Tries to create a top level path only
 *
 * @param {string} path
 * return null
 * @throws will throw the native FS errors
 */
var createPath = function(path) {
    fs.mkdirSync(path);
};

var canCreateDirectory = function (path) {
    return Q.Promise(function (resolve, reject) {
        if (module.exports.pathExists(path)) {
            reject(new Error("Something exists there, do not create"));
        } else {
            resolve();
        }
    });
};

var createDirectory = function (path) {
    return Q.Promise(function (resolve, reject) {
        var result = CremaGlobal.window.cep.fs.makedir(path);
        if (result.err === CremaGlobal.window.cep.fs.NO_ERROR) {
            resolve();
        } else {
            reject(new Error("can not create:", result));
        }
    });
};

var deleteDirectory = function (path) {
    return Q.ninvoke(fs, "rmdir", path);
};

// DEV NOTE: The next two private functions were based on ../generator/lib/ps-dialogs

/**
 * @param {String} folder
 * @param {String} basename
 * @param {String} ext Does not include dot.
 * @return {Promise} Resolved with the selected file path or rejected with an error with a message of "cancel".
 */
var _promptForFile = function (folder, basename, ext) {
    var initialFilePath = PathUtils.buildPath(folder, basename, ext),
        escapedInitialFilePath = StringUtils.escapeForCodeContext(initialFilePath),
        jsx = 'var fileObj = File("' + escapedInitialFilePath + '").saveDlg("' + Strings.EXPORT_SINGLE_FILE_TITLE +
            '"); fileObj ? fileObj.fsName : "";';


    return Q.Promise(function(resolve, reject, notify) {
        CremaGlobal.csInterface.evalScript(jsx, function(selectedFilePath) {
            if(selectedFilePath.indexOf("EvalScript error.") > -1) {
                reject(selectedFilePath);
            } else if (!selectedFilePath) {
                reject(new Error("cancel"));
            } else {
                selectedFilePath = PathUtils.resolveInitialTilde(selectedFilePath);
                selectedFilePath = PathUtils.addExtIfNeededWithoutCausingConflicts(selectedFilePath, ext);

                resolve(selectedFilePath);
            }
        });
    });
};

/**
 * @param {String} folder
 * @return {Promise} Resolved with the selected folder path or rejected with an error with a message of "cancel".
 */
var _promptForFolder = function (folder) {
    var escapedInitialFolder = StringUtils.escapeForCodeContext(folder),
        jsx = 'var folderObj = Folder("' + escapedInitialFolder + '").selectDlg("' + Strings.EXTRACT_TITLE +
            '"); folderObj ? folderObj.fsName : "";';

    return Q.Promise(function(resolve, reject, notify) {
        CremaGlobal.csInterface.evalScript(jsx, function(selectedFilePath) {
            if(selectedFilePath.indexOf("EvalScript error.") > -1) {
                reject(selectedFilePath);
            } else if (!selectedFilePath) {
                reject(new Error("cancel"));
            } else {
                selectedFilePath = PathUtils.resolveInitialTilde(selectedFilePath);

                resolve(selectedFilePath);
            }
        });
    });
};

var _promptForFolderInInitialPath = function (initialPath) {
    return Q.Promise(function (resolve, reject) {
        var createdFolder = false;
        module.exports.canCreateDirectory(initialPath).then(function () {
            return module.exports.createDirectory(initialPath);
        }).then(function () {
            createdFolder = true;
        }).finally(function () {
            var promise = _promptForFolder(initialPath);
            if (createdFolder) {
                promise.then(function (selectedPath) {
                    if (selectedPath.indexOf(initialPath) !== 0) {
                        module.exports.deleteDirectory(initialPath);
                    }
                    resolve(selectedPath);
                }, function (e) {
                    module.exports.deleteDirectory(initialPath).finally(reject.bind(null, e));
                });
            } else {
                promise.done(resolve, reject);
            }
        });
    });
};

var getExportDirectoryDefaults = function (docFileBaseName, docFileDirectory) {
    //default folder name is not localized because we want to match generator and such which also don't localize 
    //the actual folder name
    var defaultName = docFileBaseName + "-assets",
        isWin = CremaGlobal.csInterface.getOSInformation().indexOf("Windows") > -1,
        finalName,
        finalParentDir,
        finalPath;

    finalPath = Path.join(docFileDirectory, defaultName);

    if (module.exports.pathExists(finalPath)) {
        finalParentDir = Path.dirname(finalPath);
        finalName = Path.basename(finalPath);
    } else {
        finalPath = docFileDirectory;
        finalParentDir = docFileDirectory;
        finalName = Path.basename(finalPath);
    }

    return {
        isWin: isWin,
        name: finalName,
        parentDir: finalParentDir,
        path: finalPath
    };
};

var promptForExportDirectory = function (docFileBaseName, docFileDirectory) {
    var defaults = module.exports.getExportDirectoryDefaults(docFileBaseName, docFileDirectory);
    return _promptForFolderInInitialPath(defaults.path);
};

var promptForExportFile = function (docFileBaseName, assetBasename, ext, docFileDirectory) {
    var defaults = module.exports.getExportDirectoryDefaults(docFileBaseName, docFileDirectory);

    var initialPath = defaults.path,
        fileTypes = [ext],
        friendlyFilePrefix = module.exports.formatExtensionForFilter(ext),
        defaultName = assetBasename + "." + ext;

    return _promptForFile(initialPath, assetBasename, ext)
        .then(function (path) {
            // CremaGlobal.window.console.log("fileDialog.promptForExportFile return", path);
            return PathUtils.addExtIfNeededWithoutCausingConflicts(path, ext);
        });
};

var formatExtensionForFilter = function(ext) {
    return ext.toUpperCase() + " (*." + ext.toLowerCase() + ")";
};

module.exports.promptForExportDirectory = promptForExportDirectory;
module.exports.promptForExportFile = promptForExportFile;
module.exports.pathExists = pathExists;
module.exports.createPath = createPath;
module.exports.canCreateDirectory = canCreateDirectory;
module.exports.createDirectory = createDirectory;
module.exports.deleteDirectory = deleteDirectory;
module.exports.getExportDirectoryDefaults = getExportDirectoryDefaults;
module.exports.formatExtensionForFilter = formatExtensionForFilter;
