/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
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
        path = require("path"),
        AssetExporter = require("./asset-exporter"),
        DocumentManager = require("generator-assets/lib/documentmanager"),
        FileUtils = require("./file-utils"),
        PreviewCache = require("./preview-cache");

    // TODO: This class doesn't represent any abstraction layer. It's vestigal and should be rethought. Perhaps some or
    // all of it belongs in AssetExporter.
    function AssetExtractor() {
        this._generator = null;
        this._config = null;
        this._logger = null;
        this._documentManager = null;
    }
        
    AssetExtractor.prototype.init = function (generator, config, logger) {
        this._generator = generator;
        this._config = config;
        this._logger = logger;
        var options = { clearCacheOnChange: true,
                        getDocumentInfoFlags: { getTextStyles: false,
                                                compInfo: false,
                                                getCompLayerSettings:false }};
        this._documentManager = new DocumentManager(generator, config, logger, options);
    };
    
    /**
     * Renders a component object, representing an asset, to a temporary location
     *
     * @param {!Component} component
     * @param {number} component.documentId Document to export, or if layerId is defined, the document that the layerId
     *      belongs to.
     * @param {number=} component.layerId Layer to export.
     * @param {!string} component.extension The type of asset to export (e.g. "jpg").
     * @param {number=} component.quality Quality settings for the exported asset.
     *      For extension "png", set quality to 8 to produce a PNG-8 image.
     *      For extension "jpg", set quality from 0-100.
     * @param {number=} component.scale The scale of the exported asset.
     * @param {number=} component.width The width of the exported asset.
     * @param {number=} component.height The height of the exported asset.
     * return {Promise} This promise is resolved when the layer is finished rendering with the temp file location or buffer
     */
    AssetExtractor.prototype.generateComponent = function (component) {
        // Resolve documentId and layerId to DOM objects.
        return this
            .getDocument(component.documentId)
            .then(function (document) {
                component.document = document;

                if (component.layerId) {
                    var result = document.layers.findLayer(component.layerId);
                    if (!result) {
                        throw new Error("Layer with id %d not found.", component.layerId);
                    }

                    component.layer = result.layer;
                }

                return AssetExporter
                    .exportAsset({
                        component: component,
                        generator: this._generator,
                        logger: this._logger,
                        config: this._config
                    });
            }.bind(this));
    };

    AssetExtractor.prototype.generatePreview = function (component, connectionId) {
        var tempAssetPath,
            renderingWarnings;
        return this
            .generateComponent(component)
            .then(function (result) {
                result = result || {};
                tempAssetPath = result.path;
                renderingWarnings = result.errors;

                var previewId = PreviewCache.insert(connectionId, tempAssetPath);
                component.id = previewId;

                // TODO: I'm not sure we need the concept of "invisible". It should result in the same error as
                // hasZeroBounds in the Crema UI. Perhaps we can remove it and just rely on hasZeroBounds.
                // Document component does not have a layer
                component.invisible = component.layer && !this._isComponentVisible(component.layer);

                if (result.path) {
                    // Preview rendered to temp file
                    return FileUtils.stat(result.path);
                }
                return { size: 0 };
            }.bind(this))
            .then(function (fileStats) {
                component.fileSize = fileStats.size;
                return this._createComponentRenderedEvent(component, renderingWarnings);
            }.bind(this))
            .catch(function (e) {
                e = e || {};
                this._logger.error("Error generating preview:", this._getComponentNameForLogging(component), e);
                return this._createComponentRenderedEvent(component, e);
            }.bind(this));
    };

    AssetExtractor.prototype.getPreview = function (previewId) {
        return PreviewCache.get(previewId);
    };

    AssetExtractor.prototype.deleteAllPreviewsForConnection = function (connectionId) {
        var deletedItems = PreviewCache.deleteAllPreviewsForConnection(connectionId);
        if (deletedItems.length > 0) {
            this._logger.log("Deleted previews for connection:", connectionId, deletedItems);
        }
        return deletedItems;
    };

    AssetExtractor.prototype._getComponentNameForLogging = function (component) {
        return (component.layer && component.layer.name) ||
            (component.document && component.document.name);
    };

    // TODO: Eventually we should respond directly to the generatePreview server command instead of emitting a separate
    // component rendered event.
    AssetExtractor.prototype._createComponentRenderedEvent = function(component, error) {
        var errorMessages = null;        
        if (Array.isArray(error)) {
            errorMessages = error;
        } else if (error && error.hasOwnProperty("message")) {
            errorMessages = [error.message];
        }

        return {
            eventType: "componentRendered",
            timestamp: component.timestamp,
            documentId: component.documentId,
            layerId: component.layerId,
            componentId: component.id,
            fileSize: component.fileSize,
            scale: component.scale,
            invisible: component.invisible,
            hasZeroBounds: !!(error && error.zeroBoundsError),
            outsideDocumentBounds: !!(error && error.outsideDocumentBoundsError),
            errors: errorMessages
        };
    };

    /**
     * Recursively determine PS visibility of layer. If visible property is undefined or null,
     * then interpret it as visible:true
     * @return {boolean} True if layer is visible in PS
     */
    AssetExtractor.prototype._isVisible = function (layer) {
        var layerVisible = (layer.visible !== false);
        if (!layerVisible || !layer.layers || !layer.layers.length) {
            return layerVisible;
        } else {
            // Only need 1 sublayer to be visible
            return layer.layers.some(this._isVisible.bind(this));
        }
    };

    /**
     * Component layer is always visible for extracting, so ignore visible flag.
     * Group is visible for extracting if it has at least one visible child.
     * @return {boolean} True if layer is visible for extracting
     */
    AssetExtractor.prototype._isComponentVisible = function (layer) {
        return !layer || !layer.layers || layer.layers.some(this._isVisible.bind(this));
    };

    /**
     * Exports a component object, representing an asset, to its specified location.
     *
     * @param {!Component} component
     * @param {number} component.documentId Document to export, or if layerId is defined, the document that the layerId
     *      belongs to.
     * @param {number=} component.layerId Layer to export.
     * @param {!string} component.extension The type of asset to export (e.g. "jpg").
     * @param {!string} component.path The full destination path for the exported asset.
     * @param {number=} component.quality Quality settings for the exported asset.
     *      For extension "png", set quality to 8 to produce a PNG-8 image.
     *      For extension "jpg", set quality from 0-100.
     * @param {number=} component.scale The scale of the exported asset.
     * @param {number=} component.width The width of the exported asset.
     * @param {number=} component.height The height of the exported asset.
     * return {Promise} This promise is resolved when the layer is finished exporting.
     */
    AssetExtractor.prototype.exportComponent = function (component) {
        // Resolve documentId and layerId to DOM objects.
        return this
            .generateComponent(component)
            .then(function (result) {
                var temporaryFilePath = result.path,
                    desiredFilePath = component.path;
                return FileUtils.moveTemporaryFile(temporaryFilePath, desiredFilePath, this._logger);
            }.bind(this));
    };
    
    /**
     * Gets the file size of a given component by rendering it and returning the file size
     *
     * @param {!Component} component
     * @param {number} component.documentId Document to export, or if layerId is defined, the document that the layerId
     *      belongs to.
     * @param {number=} component.layerId Layer to export.
     * @param {!string} component.extension The type of asset to export (e.g. "jpg").
     * @param {!string} component.path The full destination path for the exported asset.
     * @param {number=} component.quality Quality settings for the exported asset.
     *      For extension "png", set quality to 8 to produce a PNG-8 image.
     *      For extension "jpg", set quality from 0-100.
     * @param {number=} component.scale The scale of the exported asset.
     * @param {number=} component.width The width of the exported asset.
     * @param {number=} component.height The height of the exported asset.
     * return {Promise} This promise is resolved when the layer is finished exporting.
     */
    AssetExtractor.prototype.getComponentFileSize = function (component) {
        // Resolve documentId and layerId to DOM objects.
        return this
            .generateComponent(component)
            .then(function (result) {
                var temporaryFilePath = result.path;
            
                return FileUtils.stat(temporaryFilePath).then(function(stats) {
                    return FileUtils.removeFile(temporaryFilePath).then(function() {
                        return stats.size;
                    });
                });
            });
    };

    /**
     * Exports components objects, respresenting assets, to their specified locations.
     *
     * @param {Array} components See exportComponent for details about Component objects.
     *
     * return {Promise} Resolved when all components have either been exported or failed to export.
     */
    AssetExtractor.prototype.exportComponents = function (components) {
        var openWindow = components.some(function(component) { return component.openWindow });
        var promise = Q.allSettled(components.map(this.exportComponent, this));
        promise.spread(function (result) {
            // TODO: Put this in its own server call. It's a different concept than exporting a component.
            // If any file was successfully exported, show it in finder.
            if (result.state == "fulfilled" && openWindow) {
                FileUtils.openFolderOnceInOS(path.dirname(components[0].path));
            }
        });
        return promise;
    };

    /**
     * Gets a document by id.
     *
     * return {Promise} Resolved with the specified document or rejected if it is not available.
     */
    AssetExtractor.prototype.getDocument = function (id) {
        return this._documentManager.getDocument(id);
    };

    /**
     * Gets the currently open document in Photoshop.
     *
     * return {Promise} Resolved with the active document or rejected if none is open.
     */
    AssetExtractor.prototype.getActiveDocument = function () {
        return this._documentManager.getActiveDocument();
    };

    module.exports = new AssetExtractor();
}());
