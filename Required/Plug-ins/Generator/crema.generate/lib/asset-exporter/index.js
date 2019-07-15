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

    var Q = require("q"),
        fs = require("fs"),
        Renderer = require('generator-assets/lib/renderer'),
        PreviewCache = require("../preview-cache"),
        ConcurrencyLimiter = require('./concurrency-limiter');

    // We'll only run a sensible number of ImageMagick instances in parallel.
    var concurrencyLimiter = new ConcurrencyLimiter();

    /**
     * Output an asset to a temporary file or stream.
     *
     * @param {!Component} options.component Should have either layer or document defined.
     * @param {Layer=} options.component.layer Layer to export. Exclusive of document.
     * @param {Document=} options.component.document Document to export. Exclusive of document.
     * @param {string} options.component.extension The type of asset to export (e.g. "jpg").
     *
     * @param {Generator} options.generator
     * @param {Logger} options.logger
     * @param {Object} options.config Config passed to the Renderer.
     *
     * return {Promise} Resolves with an object containing a path property, referring to the
     *                  temporary file path of the exported asset.
     */
    var exportAsset = function(options) {
        var cachedPreview, deferred,
            component = options.component;

        // Try to re-use cached preview so generator doesn't have to create a new image.
        // `isPreview` indicates that this component has same scale as image in preview.
        // `stream` indicates that component is being written to stream for Preview. Otherwise,
        // component is being written to disk for Export and we can use previously cached Preview.
        if (component.isPreview && !component.stream) {
            cachedPreview = PreviewCache.get(component.previewId);

            // Verify that preview exists in cache and has data buffer (as opposed to a temp file reference)
            if (cachedPreview && cachedPreview.buffer) {
                return Q
                    .nfcall(fs.writeFile, component.path, cachedPreview.buffer)
                    .thenResolve({ path: component.path });
            }
        }

        var rendererFactory = (component.extension == "svg") ? Renderer.createSVGRenderer : Renderer.createPixmapRenderer,
            document = component.document || component.layer.document,
            renderer = rendererFactory(options.generator, options.config, options.logger, document);

        return concurrencyLimiter.enqueue(function() {
            // Prefer caller provided stream
            if (component.stream) {
                return renderer.renderToStream(component, component.stream);
            }
            return renderer.render(options.component);
        });
    };

    exports.exportAsset = exportAsset;
}());
