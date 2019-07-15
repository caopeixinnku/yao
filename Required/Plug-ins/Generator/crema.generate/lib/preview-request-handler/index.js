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

    var fs = require("fs"),
        Buffer = require("buffer").Buffer,
        Stream = require("stream");

    var PreviewRequestHandler = function () {};

    PreviewRequestHandler.prototype._getPreviewIdFromURI = function (uri) {
        var parts = uri.split("/"),
            resourceName,
            filename,
            filenameParts,
            previewId;

        // Remove the empty string before the initial slash.
        parts.shift();

        // Remove the "preview" part of the URI.
        resourceName = parts.shift();
        if (resourceName !== "preview") {
            return null;
        }

        // Parse the preview.extension part of the URI.
        filename = parts.shift();
        filenameParts = filename.split(".");
        previewId = parseInt(filenameParts[0], 10);
        return isNaN(previewId) ? null : previewId;
    };
    
    /**
     * @param uri
     * @param response
     * @param contentType
     * @param getPreviewFunction Function that takes a preview id and returns the corresponding file path for the
     *      preview, or a falsy value if no preview exists.D
     */
    PreviewRequestHandler.prototype.handlePreviewRequest = function (uri, response, contentType, getPreviewFunction) {
        var previewId,
            previewItem,
            arrayBuffer,
            chunk,
            headTags,
            fsOptions,
            readStream;

        previewId = this._getPreviewIdFromURI(uri);
        if (previewId === null) {
            response.writeHead(400, { "Content-Type": "text/plain" });
            response.write("malformed route\n");
            response.end();
            return;
        }

        previewItem = getPreviewFunction(previewId);
        if (!previewItem || (!previewItem.tempAssetPath && !previewItem.buffer)) {
            response.writeHead(404, { "Content-Type": "text/plain" });
            response.write("preview not found\n");
            response.end();
            return;
        }

        headTags = { "Content-Type": contentType };
        if (contentType === "image/svg+xml") {
            fsOptions = { encoding: "utf8" };
            headTags.Vary = "Accept-Encoding";
        }

        // Open stream, then write header in case the open throws an exception.
        if (previewItem.buffer) {
            // Stream from buffer
            var encoding = fsOptions && fsOptions.encoding;

            arrayBuffer = previewItem.buffer.slice(0);  // copy
            readStream = new Stream.Readable(fsOptions);
            readStream._read = function (n) {
                if (0 < n && n < arrayBuffer.length) {
                    chunk = arrayBuffer.slice(0, n);
                    this.push(chunk, encoding);
                    arrayBuffer = arrayBuffer.slice(n);
                } else {
                    this.push(arrayBuffer, encoding);
                    this.push(null);
                    arrayBuffer = new Buffer(0);
                }
            };
        } else {
            // Stream from file
            readStream = fs.createReadStream(previewItem.tempAssetPath, fsOptions);
        }
        response.writeHead(200, headTags);
        readStream.pipe(response);
    };

    module.exports = new PreviewRequestHandler();
}());
