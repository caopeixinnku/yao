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

/**
 * This class forwards certain PS events to CEP. This class queues a PS event destined for a CEP modal while CEP is
 * launching. When the CEP modal finishes launching, it'll immediately request the queued event, and we'll send it.
 * Then, the CEP modal will proceed happily with its intended workflow.
 *
 * In a perfect world, PS would queue the event and send it directly to CEP when it's done launching. However, this
 * requires far more PS code (and implementation time) than using generator as an event forwarder like this.
 */
(function () {
    "use strict";

    var _ = require("underscore"),
        FileUtils = require("../file-utils");

    var PreviewCache = function () {
        // Cache is a a map of previewId -> { connectionId, tempAssetPath, buffer }
        // where tempAssetPath and buffer are mutually exclusive
        this._cache = {};
        this._currentPreviewId = 0;
    };

    PreviewCache.prototype.get = function (previewId) {
        return this._cache[previewId];
    };

    PreviewCache.prototype.insert = function (connectionId, tempAssetPath) {
        var previewId = this._createNewPreviewId();
        this._cache[previewId] = { connectionId: connectionId, tempAssetPath: tempAssetPath };
        return previewId;
    };

    PreviewCache.prototype.setBuffer = function (previewId, buffer) {
        var item = this._cache[previewId];
        if (item) {
            item.buffer = buffer;
        }
    };

    PreviewCache.prototype.del = function (previewId) {
        var asset = this.get(previewId);
        if (!asset) {
            return;
        }

        delete this._cache[previewId];

        if (asset.tempAssetPath) {
            FileUtils
                .removeFile(asset.tempAssetPath)
                .catch(function (e) {
                    console.error("Failed to remove temporary file:", asset.tempAssetPath, e);
                });
            return asset.tempAssetPath;
        }

        return;
    };

    PreviewCache.prototype.deleteAllPreviewsForConnection = function (connectionId) {
        var deletedPaths = [];
        _.forEach(this._cache, function (cacheEntry, previewId) {
            var deletedPath;
            if (cacheEntry.connectionId == connectionId) {
                deletedPath = this.del(previewId);
                if (deletedPath) {
                    deletedPaths.push(deletedPath);
                }
            }
        }, this);
        return deletedPaths;
    };

    PreviewCache.prototype.reset = function () {
        _.forEach(this._cache, function (cacheEntry, previewId) {
            this.del(previewId);
        }, this);
        this._currentPreviewId = 0;
    };

    PreviewCache.prototype._createNewPreviewId = function () {
        this._currentPreviewId += 1;
        return this._currentPreviewId;
    };

    module.exports = new PreviewCache();
}());
