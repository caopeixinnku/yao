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

(function () {
    "use strict";

    var _ = require("underscore"),
        BoundsUtils = require("shared/BoundsUtils"),
        DocinfoUtils = require("shared/DocinfoUtils"),
        Errors = require("../errors"),
        FS = require("fs"),
        FilePathSanitizer = require("shared/FilePathSanitizer"),
        MaxPixels = require("shared/MaxPixels"),
        Constants = require("shared/Constants"),
        Path = require("path"),
        PathUtils = require("shared/PathUtils"),
        UserSettings = require("shared/UserSettings"),
        PSEventStrings = require("../ps-event-strings"),
        Q = require("q");

    /**
     * @param {Object} options
     * @param {Headlights} options.headlights
     * @param {PSDialogs} options.psDialogs
     * @param {Function} options.requestAccurateBoundsFunction
     * @param {Function} options.exportComponentsFunction
     * @param {Metadata} options.metadataProvider should provide a object with readMetadata and writeMetadata functions
     */
    var QuickExport = function (options) {
        this._headlights = options.headlights;
        this._psDialogs = options.psDialogs;
        this._requestAccurateBoundsFunction = options.requestAccurateBoundsFunction;
        this._exportComponentsFunction = options.exportComponentsFunction;
        this._metadataProvider = options.metadataProvider;
        //i want a better way to do DI
        this._UserSettings = new UserSettings(require("shared/UserSettings/SettingsFileInterface.js"));
    };

    /*
    @return {Promise} Resolves with an array of exported asset paths. Rejects if an unexpected error occurs.
    */
    QuickExport.prototype.run = function (psEvent, docinfo) {
        return Q
            .resolve()
            .then(function () {
                var event = this._unwrapPSEvent(psEvent);
                if (!event) {
                    return Q.reject(new Error("Unrecognized quick export event: " + JSON.stringify(psEvent, null, 4)));
                }

                return this._performWorkflow(event, docinfo);
            }.bind(this))
            .catch(function (e) {
                if (e && e.message === "cancel") {
                    // User cancelled the dialog. Nothing to do here.
                    return [];
                }

                if (e instanceof Errors.UserFacingError) {
                    // There was an expected error we need to show the user.
                    this._psDialogs.alert(e.message);
                    return [];
                }

                // Uh oh, we didn't expect this error. Propagate it.
                throw e;
            }.bind(this));
    };

    QuickExport.prototype._unwrapPSEvent = function (psEvent) {
        return this._unwrapPSEventByName(psEvent, PSEventStrings.QUICK_EXPORT_DOCUMENT) ||
            this._unwrapPSEventByName(psEvent, PSEventStrings.QUICK_EXPORT_SELECTION);
    };

    QuickExport.prototype._unwrapPSEventByName = function (psEvent, eventName) {
        // In the raw PS event, the real event params are inside a property with the same name as the event.
        var unwrappedEvent = psEvent[eventName];
        if (!unwrappedEvent) {
            return null;
        }

        unwrappedEvent.name = eventName;

        // TODO: Fix this in the PS event code, not here.
        // Don't create an assets folder when prompting for save location.
        if (unwrappedEvent.promptForSaveLocation && !FS.existsSync(unwrappedEvent.destFolder)) {
            unwrappedEvent.destFolder = Path.resolve(Path.join(unwrappedEvent.destFolder, '..'));
        }

        return unwrappedEvent;
    };

    QuickExport.prototype._logAssetSummary = function (itemType, exportCount, seconds) {
        this._headlights.accumulateData(this._headlights.EXPORTTYPE, this._headlights.QUICK);
        this._headlights.accumulateData(this._headlights.ITEMTYPE, itemType);
        this._headlights.accumulateData(this._headlights.ITEMCOUNT, exportCount);
        this._headlights.accumulateData(this._headlights.SECONDS, seconds);
        this._headlights.logAccumulatedData(this._headlights.EXPORT_SUMMARY_GROUP);
    };

    QuickExport.prototype._logDataForOneAsset = function (event, bounds, itemType, component) {
        var format = event.fileType,
            quality = event.quality,
            scale = component.scale || 1,
            metadata = event.metadata !== Constants.META_DATA.NONE ?
                this._headlights.COPY_AND_CONTACT :
                this._headlights.NONE; 

        this._headlights.accumulateData(this._headlights.EXPORTTYPE, this._headlights.QUICK);
        this._headlights.accumulateData(this._headlights.ITEMTYPE, itemType);
        this._headlights.accumulateData(this._headlights.REQUESTED_WIDTH, bounds.width());
        this._headlights.accumulateData(this._headlights.REQUESTED_HEIGHT, bounds.height());
        this._headlights.accumulateData(this._headlights.SCALE, scale);
        this._headlights.accumulateData(this._headlights.METADATA, metadata);
        this._headlights.accumulateData(this._headlights.CONVERT_CS, !!event.sRGB);

        if (format === "png" && quality !== "100") {
            format += quality;
        } else if (format.substr(0,4) === "png-") {
            format = format.replace("-", "");
        }

        this._headlights.accumulateData(this._headlights.FORMAT, format);

        if (format === "jpg") {
            quality = parseInt(quality);
            this._headlights.accumulateData(this._headlights.QUALITY, quality);
        }

        // log accumulated data for this asset
        this._headlights.logAccumulatedData(this._headlights.EXPORT_ASSETS_GROUP);
    };

    /**
     * Log info in headlights about what we exported - a summary, info about each asset,
     * and a "done" event.
     * exportDoc is true if we're exporting a document (and not doc w/ artboards, not layers)
     * If we're doing a doc with artboards, exportDoc will be false but the event name will be QUICK_EXPORT_DOCUMENT.
     */
    QuickExport.prototype._logExportHeadlights = function (event, exportedComponents, exportDoc, seconds) {
        var itemType,
            hlDoneEvent;

        if (exportDoc) {
            itemType = this._headlights.DOCUMENT;
            hlDoneEvent = this._headlights.QUICK_EXPORT_FOR_DOCUMENT_DONE;
            this._logAssetSummary(itemType, 1, seconds);
            this._logDataForOneAsset(event, exportedComponents[0].document.bounds, itemType, exportedComponents[0]);
        } else {
            if (event.name === PSEventStrings.QUICK_EXPORT_DOCUMENT) {
                itemType = this._headlights.ARTBOARD;
                hlDoneEvent = this._headlights.QUICK_EXPORT_FOR_DOCUMENT_ARTBOARDS_DONE + exportedComponents.length;
                this._logAssetSummary(itemType, exportedComponents.length, seconds);
            } else {
                itemType = this._headlights.SELECTION;
                hlDoneEvent = this._headlights.QUICK_EXPORT_FOR_SELECTION_DONE + exportedComponents.length;
                this._logAssetSummary(itemType, exportedComponents.length, seconds);
            }

            exportedComponents.forEach(function (component) {
                this._logDataForOneAsset(event, component.layer.bounds, itemType, component);
            }.bind(this));
        }
        this._headlights.logEvent(this._headlights.CREMA_FUNNEL, hlDoneEvent);
    };

    QuickExport.prototype._performWorkflow = function (event, docinfo) {
        if (event.name === PSEventStrings.QUICK_EXPORT_DOCUMENT) {
            // Does doc have artboards? If so, export each of them, not the doc as a whole.
            var artboards = DocinfoUtils.getArtboards(docinfo);
            if (artboards.length !== 0) {
                this._headlights.logEvent(this._headlights.CREMA_FUNNEL, this._headlights.QUICK_EXPORT_FOR_DOCUMENT_ARTBOARDS_START);
                return this._exportLayers(event, docinfo, artboards);
            }

            this._headlights.logEvent(this._headlights.CREMA_FUNNEL, this._headlights.QUICK_EXPORT_FOR_DOCUMENT_START);
            return this._exportDocument(event, docinfo);
        } else if (event.name === PSEventStrings.QUICK_EXPORT_SELECTION) {
            var exportableLayers = DocinfoUtils.getLayersForExport(docinfo),
                selectionLen = docinfo && docinfo._selectionById ? docinfo._selectionById.length : 0;
            this._headlights.logEvent(this._headlights.CREMA_FUNNEL, this._headlights.QUICK_EXPORT_FOR_SELECTION_START + selectionLen);
            if (exportableLayers.length < selectionLen) {
                this._headlights.logEvent(this._headlights.CREMA_ACTION, this._headlights.EXPORTING_FEWER_THAN_SELECTED_QUICK);
            }
            return this._exportLayers(event, docinfo, exportableLayers);
        } else {
            return Q.reject(new Error("Unrecgonized quick export event name: " + event.name));
        }
    };

    QuickExport.prototype._exportDocument = function (event, docinfo) {
        var component,
            startTime;
        return Q
            .resolve()
            .then(function () {
                var documentBasename = Path.basename(docinfo.file, Path.extname(docinfo.file)),
                    sanitizedBasename = FilePathSanitizer.sanitize(documentBasename);

                if (event.promptForSaveLocation) {
                    event.destFolder = this._UserSettings.get(docinfo.file) ||  event.destFolder;
                    return this._psDialogs.promptForFile(event.destFolder, sanitizedBasename, event.fileType);
                } else {
                    return PathUtils.buildPath(event.destFolder, sanitizedBasename, event.fileType);
                }

            }.bind(this))
            .then(function (assetPath) {
                startTime = new Date().getTime();
                component = this._buildComponent(event, docinfo.id, null, docinfo.bounds, assetPath);
                return this._exportComponents([component]);
            }.bind(this))
            .then(function (result) {
                var stopTime = new Date().getTime(),
                    secondsToTenths = Math.round((stopTime - startTime) / 100) / 10;
                this._logExportHeadlights(event, [component], true, secondsToTenths);
                return result;
            }.bind(this))
            .then(_.partial(this._stashDirSetting, docinfo).bind(this));
    };

    QuickExport.prototype._exportLayers = function (event, docinfo, layers) {
        var basenamesMap = FilePathSanitizer.createSanitizedUniqueLayerBasenamesMap(layers),
            components,
            startTime;

        return Q
            .resolve()
            .then(function () {
                return BoundsUtils.ensureAccurateBoundsForLayers(layers, docinfo, this._requestAccurateBoundsFunction);
            }.bind(this))
            .then(function () {
                layers = this._getNonEmptyLayers(layers, docinfo);
                if (layers.length <= 0) {
                    throw new Errors.EmptySelectionError();
                }

                return this._getSaveLocation(event, docinfo, layers);
            }.bind(this))
            .spread(function (destFolder, destBasename) {
                startTime = new Date().getTime();
                components = layers.map(function (selectedLayer) {
                    // Note that if destBasename is provided, we are only exporting a single layer.
                    var basename = destBasename || basenamesMap[selectedLayer.id],
                        assetPath = PathUtils.buildPath(destFolder, basename, event.fileType);
                    return this._buildComponent(event, docinfo.id, selectedLayer.id, selectedLayer.bounds, assetPath);
                }, this);

                return this._exportComponents(components);
            }.bind(this))
            .then(function (result) {
                var stopTime = new Date().getTime(),
                    secondsToTenths = Math.round((stopTime - startTime) / 100) / 10;
                this._logExportHeadlights(event, components, false, secondsToTenths);
                return result;
            }.bind(this))
            .then(_.partial(this._stashDirSetting, docinfo).bind(this));
    };

    QuickExport.prototype._stashDirSetting = function(docinfo, result) {
        this._UserSettings.setCachedValue(docinfo.file, Path.dirname(_.first(result)));
        return result;
    };
    /**
     * @return {Promise} Resolves with the destFolder as the first result, and if a file was selected, the destBasename
     *      as the second result.
     */
    QuickExport.prototype._getSaveLocation = function (event, docinfo, selectedLayers) {
        // No prompt needed, multiple or single selection.
        if (!event.promptForSaveLocation) {
            return [event.destFolder];
        }

        event.destFolder = this._UserSettings.get(docinfo.file) ||  event.destFolder;

        // Multiple selection prompt.
        if (selectedLayers.length > 1) {
            return [this._psDialogs.promptForFolder(event.destFolder)];
        }

        // Single selection prompt.
        var selectedLayer = selectedLayers[0],
            sanitizedBasename = FilePathSanitizer.sanitize(selectedLayer.name);
        return this._psDialogs
            .promptForFile(event.destFolder, sanitizedBasename, event.fileType)
            .then(function (destPath) {
                var destFolder = Path.dirname(destPath),
                    destBasename = Path.basename(destPath, Path.extname(destPath));
                return [destFolder, destBasename];
            });
    };

    QuickExport.prototype._getNonEmptyLayers = function (selectedLayers, docinfo) {
        return selectedLayers.filter(function (selectedLayer) {
            if (BoundsUtils.layerHasZeroBounds(selectedLayer)) {
                this._headlights.logEvent(this._headlights.CREMA_ACTION, this._headlights.LAYER_EMPTY_QUICK_EXP);
                return false;
            } else if (BoundsUtils.layerIsOutsideDocumentBounds(selectedLayer, docinfo)) {
                this._headlights.logEvent(this._headlights.CREMA_ACTION, this._headlights.LAYER_OUTSIDE_DOC_QUICK_EXP);
                return false;
            } else if (DocinfoUtils.layerIsArtboard(selectedLayer) && BoundsUtils.allChildrenAreEmpty(selectedLayer)) {
                this._headlights.logEvent(this._headlights.CREMA_ACTION, this._headlights.ARTBOARD_EMPTY_QUICK_EXP);
                return false;
            } else if (BoundsUtils.layerIsClippedByDocumentBounds(selectedLayer, docinfo)) {
                this._headlights.logEvent(this._headlights.CREMA_ACTION, this._headlights.LAYER_CLIPPEDBY_DOC_QUICK_EXP);
                return true;
            }
            return true;
        }.bind(this));
    };

    QuickExport.prototype._buildComponent = function (event, documentId, layerId, sourceObjectBounds, assetPath) {
        var component = {
                documentId: documentId,
                extension: event.fileType,
                path: assetPath
            },
            sourceObjectDimensions = BoundsUtils.boundsToDimensions(sourceObjectBounds),
            scale = event.scale || 1,
            maxScale = MaxPixels.getMaxScaleFactor(sourceObjectDimensions);

        if (layerId) {
            component.layerId = layerId;
        }

        if (event.quality) {
            component.quality = event.quality;
        }

        if (scale > maxScale) {
            this._headlights.logEvent(this._headlights.CREMA_WARNING, this._headlights.MAX_EXCEEDED_SCALE);
            this._headlights.logData(this._headlights.MAX_EXCEEDED_GROUP, this._headlights.MAX_EXCEEDED_SCALE, scale);
            scale = maxScale;
        }

        if (scale !== 1) {
            component.scale = scale;
        }

        if (event.sRGB) {
            component.useICCProfile = Constants.SRGB_COLOR_PROFILE;
        }
        if (event.openWindow) {
            component.openWindow = event.openWindow || false;
        }
        if(event.metadata && event.metadata !== Constants.META_DATA.NONE) {
            component.metadataType = event.metadata;
        }

        return component;
    };

    QuickExport.prototype._exportComponents = function (components) {
        return this
            ._exportComponentsFunction(components)
            .spread(function (result) {
                // TODO: Put errors from FileUtils in Errors.js and just propagate them here.
                var error = result && result.reason;
                if (error && /WriteError/.test(error.message)) {
                    this._headlights.logEvent(this._headlights.CREMA_ACTION, this._headlights.WRITEERROR_ON_QUICK_EXPORT);
                    throw new Errors.FSWriteError(Path.dirname(components[0].path));
                }
            }.bind(this))
            .then(function(results) {
                var metadata = components.filter(function(component) { 
                        return  component.metadataType && component.metadataType !== Constants.META_DATA.NONE; 
                    }),
                    includeUserMetadata = (metadata.length);

                return this._metadataProvider.readMetadata(includeUserMetadata)
                    .then(function(data) {
                        // avoid writing empty metatdata; It is a stringified array so length should g.t. 2
                        if (data && data.length > 2) {
                            return components.map(function(component) {
                                return this._metadataProvider.writeMetadata(component.path, data);
                            }.bind(this));
                        }
                        return [];
                    }.bind(this))
                    .catch(function (e) {
                        this._headlights.logEvent(this._headlights.CREMA_ACTION, this._headlights.METADATA_READERROR);
                        return [e];
                    }.bind(this));
            }.bind(this))
            .spread(function() {
                return _(components).pluck("path");
            });
    };

    module.exports = QuickExport;
}());
