/*
 * Copyright (c) 2015 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, node: true, plusplus: true, devel: true, nomen: true, indent: 4*/

(function () {
    "use strict";

    var fs = require("fs-extra"),
        os = require("os"),
        path = require("path"),
        exec = require("child_process").exec,
        Q = require("q"),
        util = require("util");

    var MAX_PATH_LENGTH = os.platform() === "darwin" ? 255 : 260,
        gFolderShownInOS = {};

    var PermissionsWriteError = function () {
        this.message = "PermissionsWriteError";
    };
    util.inherits(PermissionsWriteError, Error);

    var PathTooLongWriteError = function () {
        this.message = "PathTooLongWriteError";
    };
    util.inherits(PathTooLongWriteError, Error);

    /**
     * Tries to move a file and if that fails, tries to copy it.
     *
     * @param {string} sourceFullPath
     * @param {string} destFullPath
     * @param {?Logger} logger
     * return {Promise} Resolved when moving is complete. Throws an error if destination was not writable.
     */
    var moveFile = function(sourceFullPath, destFullPath, logger) {
        if (destFullPath.length > MAX_PATH_LENGTH) {
            var message = "Cannot move file because path is too long:" + destFullPath;
            if (logger)
                logger.warn(message);
            return Q.reject(new PathTooLongWriteError());
        }

        var targetDirectory = path.dirname(destFullPath);

        return Q.ninvoke(fs, "mkdirs", targetDirectory)
            .then(function () {
                return Q.ninvoke(fs, "rename", sourceFullPath, destFullPath);
            }.bind(this))
            .catch(function (e) {
                if (logger)
                    logger.warn("Unable to move file. Copying instead:", e);

                return Q.ninvoke(fs, "copy", sourceFullPath, destFullPath)
                    .then(function () {
                        return removeFile(sourceFullPath)
                            .then(function(e) {
                                if (logger)
                                    logger.warn("Unable to remove file after copy:", e);
                            });
                    })
                    .catch(function (e) {
                        throw new PermissionsWriteError();
                    });
            }.bind(this));
    };

    /**
     * Tries to remove a file.
     *
     * @param {string} fullPath
     * return {Promise}
     */
    var removeFile = function(fullPath) {
        return Q.ninvoke(fs, "remove", fullPath);
    };
    
    /**
     * Call stat on a given file
     *
     * @param {string} fullPath
     * return {Promise}
     */
    var stat = function(fullPath) {
        return Q.ninvoke(fs, "stat", fullPath);
    };

    /**
     * Tries to move a temporary file and deletes the temporary file if something goes wrong.
     *
     * @param {string} temporaryFilePath
     * @param {string} destFullPath
     * @param {?Logger} logger
     * return {Promise}
     */
    var moveTemporaryFile = function(temporaryFilePath, destFullPath, logger) {
        return moveFile(temporaryFilePath, destFullPath, logger)
            .catch(function(e) {
                // Clean up the temporary file after a failed move.
                removeFile(temporaryFilePath)
                    .catch(function (e) {
                        if (logger)
                            logger.warn("Unable to remove temporary file after failed move:", e);
                    });

                // Propagate any write error.
                throw e;
            });
    };
    
    /**
     * Opens the given folder in the OS
     *
     * @param {string} destFolder
     * return {Promise}
     */
    var openFolderInOS = function (destFolder) {
        var win32 = process.platform === 'win32',
            command = "";

        destFolder = path.normalize(destFolder);

        if (!destFolder) {
            return Q.resolve();
        }
        
        if (win32) {
            command = "explorer /root," + destFolder;
        } else {
            command = "open '" + destFolder + "'";
        }
        return Q.nfcall(exec, command);
    };
    
    /**
     * Opens the given folder in the OS, but only runs once per session
     *
     * @param {string} destFolder
     * return {Promise}
     */
    var openFolderOnceInOS = function (destFolder) {
        if (!gFolderShownInOS[destFolder]) {
            gFolderShownInOS[destFolder] = true;
            return exports.openFolderInOS(destFolder);
        }
        return Q.resolve();
    };

    exports.PermissionsWriteError = PermissionsWriteError;
    exports.PathTooLongWriteError = PathTooLongWriteError;
    exports.moveFile = moveFile;
    exports.removeFile = removeFile;
    exports.stat = stat;
    exports.moveTemporaryFile = moveTemporaryFile;
    exports.openFolderInOS = openFolderInOS;
    exports.openFolderOnceInOS = openFolderOnceInOS;
}());
