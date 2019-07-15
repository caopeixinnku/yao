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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true, node: true, unused:true*/

"use strict";

var Backbone        = require('backbone'),
    _               = require("underscore"),
    Q               = require("q"),
    Path            = require("path"),
    DocinfoUtils    = require("shared/DocinfoUtils"),
    DocumentLayer   = require("./documentLayer.js"),
    ServerInterface = require("./serverInterface.js"),
    Strings         = require("./LocStrings"),
    JSXRunner       = require("./JSXRunner"),
    BoundsUtils     = require("shared/BoundsUtils"),
    Constants       = require("shared/Constants"),
    LayerNameParser = require("./utils/LayerNameParser.js"),
    GenableCollection   = require("./genableCollection.js"),
    GenSettingsModel    = require("./genSettingsModel.js"),
    LayerModel          = require("./layerModel.js"),
    AssetSizeCollection = require("./assetSizeCollection.js"),
    DocSettings         = require("./docSettings.js"),
    ActionRollup        = require("./actionRollup.js"),
    ExportKind          = require("./exportKind.js"),
    CremaGlobal         = require("./cremaGlobal.js"),
    Headlights          = require("./utils/Headlights");

var GENERATOR_PLUGIN_ID = "crema";

var GeneratorModel = Backbone.Model.extend({
    initialize: function () {
        if (CremaGlobal.csInterface.getExtensionID() === "com.adobe.WEBPA.crema.saveforwebdocument") {
            this.set("exportKind", ExportKind.Document);
            // we'll distinguish between "doc" and "doc with artboards" later
        } else {
            this.set("exportKind", ExportKind.Selection);
        }
        
        this.layerCollection = new GenableCollection([], { model: LayerModel });
        this.generatorSettings = {};
        this.generatorSettings.assetSizeCollection = new AssetSizeCollection([]);

        DocSettings._layerCollection = this.layerCollection;

        this.listenTo(this.layerCollection, "background-layer-status-change", this.handleBackgroundStatusChange);
        this.listenTo(this.layerCollection, "change:layerSettingsDisabled", this.trigger.bind(this, "change:layerSettingsDisabled"));
        this.listenTo(this.layerCollection, "change:settingsLoading add remove", this.updateLayersLoading);
        
        this.reset();
        
        this.ensureGeneratorRunning()
            .then(ServerInterface.createWebSocketConnection)
            .then(this.loadGenerator.bind(this));
        
        ServerInterface.on("asset-rendering-updated", this.handleAssetUpdate.bind(this));
        ServerInterface.on("generator-connected", this.handleGeneratorConnect.bind(this));
        ServerInterface.on("generator-closed", this.handleGeneratorClose.bind(this));
    },

    handleGeneratorClose: function () {
        this.set("generatorClosed", true);
    },

    handleGeneratorConnect: function () {
        this.set("generatorClosed", false);
    },

    handleBackgroundStatusChange: function () {
        var hasBG = this.layerCollection.hasBackgroundLayer();
        DocSettings.setDocHasBackground(hasBG);
    },
    
    ensureGeneratorRunning: function () {
        var localPrefs = require("./utils/localPrefs.js"),
            deferred = Q.defer();
        
        //comment the following line out once and run... then forever you can enjoy not having it auto-start generator
        //localPrefs.setPref("DEV-do-not-auto-start-generator", "internal-generator-off");
        
        if (localPrefs.getPref("DEV-do-not-auto-start-generator") !== "internal-generator-off") {
            JSXRunner.runJSX("ensureGenerator", false, function () {
                deferred.resolve();
            });
        } else {
            CremaGlobal.window.console.warn("RUNNING IN DEV-MODE - NOT AUTO-STARTING GENERATOR.  CLEAR localStorage prefs to reset.");
            deferred.resolve();
        }
        
        return deferred.promise;
    },

    handleAssetUpdate: function (timestamp, documentId, layerId, previewId, fileSize, scale, errors, invisible, hasZeroBounds, outsideDocumentBounds) {
        var asset,
            errorMessage = '',
            sep = '',
            layer,
            documentLayer,
            server,
            sourceObject,
        
            _isLayerClipped = function (layer, otherBounds) {
                var layerBounds = layer.get("bounds");
                return (layerBounds.top < otherBounds.top ||
                        layerBounds.left < otherBounds.left ||
                        layerBounds.bottom > otherBounds.bottom ||
                        layerBounds.right > otherBounds.right);
            };
        
        if (documentId !== this.get("docId")) {
            return Q.reject(new Error("mismatched doc ids"));
        }
        
        if (layerId) {
            asset = this.getSettingsFromLayerId(layerId);
        } else {
            // The full document asset is represented by a layer in the layer collection.
            asset = this.getSettingsFromLayerId(DocumentLayer.GetDefaultLayerID());
        }
        
        if (!asset) {
            return Q.reject(new Error("no asset found"));
        }
        
        if (errors && errors.length) {
            errors.forEach(function (err) {
                var posTimestampEnd = err.indexOf("] ");
                if (posTimestampEnd > 0) {
                    err = err.substr(posTimestampEnd + 2);
                }
                errorMessage = errorMessage + sep + err;
                sep = ', ';
            });
        }

        server = ServerInterface.SERVER_HOST + ':' + ServerInterface.getCachedCremaPort();
        if (layerId) {
            layer = this.layerCollection.findBy("layerId", layerId);
            layer.set("outsideDocumentBounds", outsideDocumentBounds);
            layer.set("clippedByArtboardBounds", false);

            if (invisible) {
                if (layer.get("isArtboard")) {
                    layer.set("artboardEmpty", true);
                    Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.ARTBOARD_EMPTY_PREV);
                } else {
                    layer.set("groupEmpty", true);
                    Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.GROUP_EMPTY_PREV);
                }
            } else if (hasZeroBounds) {
                layer.set("layerEmpty", true);
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.LAYER_EMPTY_PREV);
            }

            if (outsideDocumentBounds) {
                layer.set("clippedByDocumentBounds", false);
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.LAYER_OUTSIDE_DOC_PREV);
            } else {
                // compare layer bounds to doc bounds
                var docBounds = {top: 0,
                                 right: this.get("docWidth"),
                                 bottom: this.get("docHeight"),
                                 left: 0};
                
                if (_isLayerClipped(layer, docBounds)) {
                    layer.set("clippedByDocumentBounds", true);
                    Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.LAYER_CLIPPEDBY_DOC_PREV);
                } else {
                    var parentArtboardBounds = layer.get("parentArtboardBounds");
                    layer.set("clippedByDocumentBounds", false);
                    // if layer is in an artboard, compare layer bounds to artboard bounds
                    if (parentArtboardBounds && _isLayerClipped(layer, parentArtboardBounds)) {
                        layer.set("clippedByArtboardBounds", true);
                        Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.LAYER_CLIPPEDBY_ARTBOARD_PREV);
                    }
                }
            }
            
        } else {
            // The full document asset is represented by a layer in the layer collection.
            documentLayer = this.layerCollection.findBy("layerId", DocumentLayer.GetDefaultLayerID());
        }

        asset.set({invisible: invisible,
                   hasZeroBounds: hasZeroBounds,
                   outsideDocumentBounds: outsideDocumentBounds,
                   fileSize: fileSize,
                   docId: documentId});

        var previewErrorMessage = this.getPreviewErrorMessage(asset, layer), // Errors that kept us from generating a preview.
            previewErrorOccurred = !!previewErrorMessage,
            assetErrorMessage = previewErrorMessage || errorMessage; // May include warnings from SVG like that text rendering won't be exact.

        asset.set("errorMessage", assetErrorMessage);
        asset.updatePreviewUrl(timestamp, server, previewId, previewErrorOccurred);

        sourceObject = layer || documentLayer;
        if (sourceObject) {
            sourceObject.set("imageURL", asset.get("imageURL"));
        }
        
        return Q.resolve();
    },
    
    // TODO: We're not using this right now because we're just rendering previews of cropped images, which have accurate
    // file sizes. However, if in the future we need to support resize handles, we can send "getComponentFileSize"
    // commands to the server and keep the original (uncropped) preview around instead of rendering and receiving
    // previews of cropped images.
    _updateAssetsFileSizes: function (asset, documentId, layerId, previewFileSize) {
        if (asset.hasClippedDimensions()) {
            var component = asset.createExportComponent(documentId, layerId);
            return ServerInterface.sendCommand("getComponentFileSize", {
                component: component
            }).then(function(actualFileSize) {
                asset.set("fileSize", actualFileSize);
            });
        } else {
            asset.set("fileSize", previewFileSize);
            return Q.resolve();
        }
    },

    getPreviewErrorMessage: function (srcModel, layerModel) {
        if (this && this.get("generatorClosed")) {
            return Strings.PREVIEW_UNKNOWN;
        }

        if (srcModel && srcModel.get("invisible")) {
            if (layerModel.get("isArtboard")) {
                return Strings.PREVIEW_EMPTY_ARTBOARD;
            } else {
                return Strings.PREVIEW_EMPTY_GROUP;
            }
                
        }
        if (srcModel && srcModel.get("hasZeroBounds")) {
            return Strings.PREVIEW_EMPTY_IMG;
        }
        if (srcModel && srcModel.get("outsideDocumentBounds")) {
            return Strings.PREVIEW_DOC_CLIPPED;
        }

        if (layerModel && /\/ /.test(layerModel.get("name")) && layerModel.layerNameParseError) {
            return Strings.PREVIEW_CONFLICT;
        }
        if (layerModel && layerModel.get("layerType") === "adjustmentLayer") {
            return Strings.PREVIEW_EMPTY_IMG;
        }

        return "";
    },

    getSettingsFromLayerId: function (layerId) {
        var layer = this.layerCollection.findBy("layerId", layerId);
        if (!layer) {
            CremaGlobal.window.console.log("Look for a layerId that doesn't exist; layerId: " + layerId);
            return;
        }

        return layer.get("layerSettings");
    },

    getMetaDataSettingsForLayer: function (layer, docGeneratorSettings) {
        var generatorSettings;
        if (layer.generatorSettings && layer.generatorSettings[ServerInterface.escapePluginId(GENERATOR_PLUGIN_ID)]) {
            generatorSettings = layer.generatorSettings[ServerInterface.escapePluginId(GENERATOR_PLUGIN_ID)];
        } else if (docGeneratorSettings.layers) {
            generatorSettings = docGeneratorSettings.layers[String(layer.id)];
        }

        if (!generatorSettings) {
            generatorSettings = {
                generateItems: []
            };
        }
        return generatorSettings;
    },
    
    checkForDocumentArtboards: function (layers) {
        if (this.get("exportKind") === ExportKind.Document) {
            var hasArtboards = layers.some(function (layer) {
                return DocinfoUtils.layerIsArtboard(layer);
            });
            if (hasArtboards) {
                this.set("exportKind", ExportKind.DocumentWithArtboards);
            }
        }
    },

    _initGenableSettingsBaseNames: function(genableModel, generatorNameSettings) {
        var prevName;
        if (generatorNameSettings && generatorNameSettings.length !== 0) {
            //if the layer has generator style settings then the actual layer name is something like
            //"foobar.png, 200% foobar@2x.png" and we'd rather not use that whole string as the basename.
            //Instead pluck the first parsed setting and that files basename
            var setting = generatorNameSettings[0];
            if (setting.file) {
                prevName = Path.basename(setting.file, Path.extname(setting.file));
            } else if (setting.name) {
                prevName = setting.name;
            }
        }
        genableModel.initLayerSettingsBaseNames(prevName);
    },
    _getSettingsFromLayerName: function (layer) {
        var settings =  [];
        
        if (layer && layer.name) {
            try {
                settings = LayerNameParser.parse(layer.name);
            } catch (ex) {
                CremaGlobal.window.console.warn("Failed to parse " + JSON.stringify(layer.name) + " with " + ex);
            }
        }
        return settings;
    },
    _getSettingsFromLayerMetaData: function (layerMetaData) {
        var settings = [];
        if (layerMetaData && layerMetaData.json) {
            try {
                settings = JSON.parse(layerMetaData.json).assetSettings;
            } catch (ex) {
                CremaGlobal.window.console.warn("Failed to parse layerMetaData.json" +  layerMetaData.json + " with " + ex);
            }
        }
        return settings || [];
    },
    
    getLayerSettings: function (layer, generatorSettings) {
        var nameSettings = this._getSettingsFromLayerName(layer),
            metaDataSettings = this._getSettingsFromLayerMetaData(generatorSettings);
                
        if (metaDataSettings && metaDataSettings.length > 0 &&
            GenSettingsModel.prototype.extensionSupported(metaDataSettings[0].extension)) {
            
            generatorSettings.generateItems = metaDataSettings;
        }
        generatorSettings.layerNameSettings = nameSettings;
    },
   _isGroupInvisible: function (layer) {
        var _isVisible = function (child) {
            if (!child.visible || !child.layers || !child.layers.length) {
                return !child.visible;
            } else {
                return child.layers.every(function (subchild) {
                    return _isVisible(subchild);
                });
            }
        };
        return layer.layers && layer.layers.every(function (child) {
            //only look at children?
            return _isVisible(child);
        });
    },
    // TODO: Move into layerCollection, rename LayerCollection to SourceObjectCollection.
    populateSourceObjectCollection: function (sourceObjects, parentArtboardsMap, docGeneratorSettings, options) {
        var i;
        options = this._defaultOptions(options);
        if (docGeneratorSettings && docGeneratorSettings.defaultSettings) {
            if (docGeneratorSettings.docSettings && Object.keys(docGeneratorSettings.docSettings).length > 0 &&
                    !_.has(docGeneratorSettings.docSettings, "useICCProfile") &&
                    _.has(docGeneratorSettings.defaultSettings, "useICCProfile")) {
                // Asset exported before useICCProfile support added: defaults to useICCProfile="" (since that's how it was exported)
                docGeneratorSettings.defaultSettings.useICCProfile = "";
            } else if (!_.has(docGeneratorSettings.defaultSettings, "useICCProfile")) {
                // Asset default set created before useICCProfile support added uses new default
                docGeneratorSettings.defaultSettings.useICCProfile = Constants.SRGB_COLOR_PROFILE;
            }

            if (docGeneratorSettings.docSettings && Object.keys(docGeneratorSettings.docSettings).length > 0 &&
                    !_.has(docGeneratorSettings.docSettings, "metadataType") &&
                    _.has(docGeneratorSettings.defaultSettings, "metadataType")) {
                // Asset exported before metadataType support added: defaults to metadataType="none" (since that's how it was exported)
                docGeneratorSettings.defaultSettings.metadataType = "none";
            }

            if (!_.has(docGeneratorSettings.defaultSettings, "scale")) {
                docGeneratorSettings.defaultSettings.scale = 1;
            }
        }
        
        parentArtboardsMap = parentArtboardsMap || {};
        docGeneratorSettings = docGeneratorSettings || {};
        options = options || {};
        for (i = 0; i < sourceObjects.length; i++) {
            var sourceObject = sourceObjects[i];
            if (this.get("exportKind") === ExportKind.Document) {
                this._addDocumentModel(sourceObject, docGeneratorSettings, options);
            } else {
                this._addLayerModel(sourceObject, parentArtboardsMap, docGeneratorSettings, options);
            }
        }
    },
    populateAssetSizesCollection: function (assetSizeArray, assetSizeCollection) {
        if (!assetSizeArray || assetSizeArray.length === 0) {
            assetSizeArray = AssetSizeCollection.prototype.defaults();
        }

        assetSizeArray.forEach(function (assetSize) {
             assetSizeCollection.addAssetSize(assetSize);
        });
    },
    _addLayerModel: function (layer, parentArtboardsMap, docGeneratorSettings, options) {
        var generatorSettings = {},
            layerName = layer.name || "",
            totalMaskBounds = BoundsUtils.getTotalMaskBounds(layer),
            parentArtboard = parentArtboardsMap[layer.id],
            layerModel;

        try {
            generatorSettings = this.getMetaDataSettingsForLayer(layer, docGeneratorSettings);
        } catch (exGS) {
            CremaGlobal.window.console.warn("Exception getting generatorSettings " + exGS);
        }

        this.getLayerSettings(layer, generatorSettings);
        if (!options.isDocumentPSD) {
           docGeneratorSettings.defaultSettings = this._getDefaultSettings(options.documentExtension);
        }
        generatorSettings.assetSizeCollection = this.generatorSettings.assetSizeCollection;
        
        layerModel = new LayerModel({
            // TODO: Get these properties directly from the docinfo instead of generatorModel properties so generatorModel
            // can get closer to going away. 
            docId: this.get("docId"),
            docWidth: this.get("docWidth"),
            docHeight: this.get("docHeight"),
            layerId: layer.id,
            layerIndex: layer.index,
            layerType: layer.type,
            name: layerName,
            origName: layerName,
            invisible: this._isGroupInvisible(layer),
            isArtboard: DocinfoUtils.layerIsArtboard(layer),
            parentArtboardBounds: parentArtboard && parentArtboard.bounds,
            bounds: layer.bounds,
            totalMaskBounds: totalMaskBounds,
            boundsAreAccurate: totalMaskBounds ? true : LayerModel.prototype.isLayerDataBoundsAccurate(layer),
            dpi: this.get("dpi"),
            maxSupportedPixels: this.get("maxSupportedPixels")
        }, {
            generatorSettings: generatorSettings,
            docSettings: docGeneratorSettings.docSettings,
            defaultSettings: docGeneratorSettings.defaultSettings
        });

        this._initGenableSettingsBaseNames(layerModel, generatorSettings.layerNameSettings);
        this.layerCollection.add(layerModel);
    },
    _isDocumentPSD: function (document) {
        if(!document._fileExtension) {
            return true;
        }

        return document._fileExtension === ".psd";
    },
    _getFileExtension: function (document) {
        if(!document._fileExtension) {
            return "psd";
        }

        return document._fileExtension.replace(".", "");
    },
    _getDefaultSettings: function (filetype) {
        //this could be improved by doing a deep equals on the default settings
        //to see if they match the defaults, but this is quicker as we don't support
        //default settings on anything but the psd.
        var defaultSettings = GenSettingsModel.prototype.defaults();
        
        if(filetype) {
            defaultSettings.extension = filetype;
        }

        return defaultSettings;
    },
    _defaultOptions: function(options) {
        options = options || {};
        //in this case falsey is true (undefined or null)
        options.isDocumentPSD = (options.isDocumentPSD !== false);
        return options;
    },
    _addDocumentModel: function (document, docGeneratorSettings, options) {
        var documentLayer, 
            defaultSettings, 
            initialDefaults;

        if (docGeneratorSettings && docGeneratorSettings.defaultSettings) {
            defaultSettings = _.extend({}, docGeneratorSettings.defaultSettings);
            if (defaultSettings.extension === "svg") {
                // 3959909: ignore extension for docs if SVG
                initialDefaults = GenSettingsModel.prototype.defaults();
                defaultSettings.extension = initialDefaults.extension;
                defaultSettings.quality   = initialDefaults.quality;
            }
        } 
        if (!options.isDocumentPSD) {
           defaultSettings = this._getDefaultSettings(options.documentExtension);
        }

        // TODO: Rename DocumentLayer to DocumentModel.
        documentLayer = new DocumentLayer({
            docId: document.id,
            name: this.get("docFileBaseName"),
            bounds: _.clone(document.bounds),
            boundsAreAccurate: true,
            dpi: document.resolution,
            maxSupportedPixels: document._maxSupportedPixels,
        }, {
            generatorSettings: {
                generateItems: docGeneratorSettings && docGeneratorSettings.assetSettings,
                assetSizeCollection: this.generatorSettings.assetSizeCollection
            },
            defaultSettings: defaultSettings
        });
        documentLayer.initLayerSettingsBaseNames();
        this.layerCollection.add(documentLayer);
        return true;
    },
    loadGenerator: function () {
        ActionRollup.reset();
        this.set("layersLoading", true);
        
        return ServerInterface.sendCommand("docinfo").then(function (docinfo) {
            if(!docinfo) {
                CremaGlobal.window.console.log("No docinfo provided from server");
                return;
            }
            CremaGlobal.window.console.log("docinfo");
            CremaGlobal.window.console.log(docinfo);

            var docSettings = {},
                generatorSettings = {
                    docSettings: docSettings,
                    defaultSettings: docinfo.defaultSettings,
                    assetSizes: []
                },
                settings;
            if (docinfo.bounds) {
                this.set("docWidth", docinfo.bounds.right - docinfo.bounds.left);
                this.set("docHeight", docinfo.bounds.bottom - docinfo.bounds.top);
            } else {
                CremaGlobal.window.console.warn("Missing: docinfo.bounds");
            }
            this.set("docId", docinfo.id);
            this.set("docFilepath", docinfo.file);
            this.set("docFileBaseName", docinfo._fileBaseName || Strings.UNTITLED);
            this.set("docFileExtension", docinfo._fileExtension);
            this.set("docFileDirectory", docinfo._fileDirectory);
            this.set("dpi", docinfo.resolution);
            this.set("maxSupportedPixels", docinfo._maxSupportedPixels);
            this.layerCollection.stopListeningForFileConflicts();

            if (docinfo.generatorSettings) {
                settings = docinfo.generatorSettings[ServerInterface.escapePluginId(GENERATOR_PLUGIN_ID)];
                if (settings && settings.json) {
                    try {
                        generatorSettings = _.extend(generatorSettings, JSON.parse(settings.json));
                        generatorSettings.docSettings = _.defaults(generatorSettings.docSettings, docSettings);

                        // When we overwite the docSettings for the default export settings, make sure we don't lose the
                        // assetSettings for document export.
                        DocSettings._originalGeneratorSettings = {
                            docSettings: generatorSettings.generatorSettings,
                            assetSettings: generatorSettings.assetSettings,
                            assetSizes: generatorSettings.assetSizes
                        };
                    } catch (e) {
                        CremaGlobal.window.console.log("Error loading settings: " + e.message + "\n\tsettings: " + settings.json);
                    }
                }
            }
            this.set("docGeneratorSettings", generatorSettings);
            
            //do this early because it's visually at the top too
            this.populateAssetSizesCollection(generatorSettings.assetSizes, this.generatorSettings.assetSizeCollection);
    
            this.checkForDocumentArtboards(docinfo.layers);
        
            var parentArtboardsMap = {},
                sourceObjects = this._getSourceObjectsForExport(docinfo, parentArtboardsMap),
                psSelectionLength = docinfo._selectionById ? docinfo._selectionById.length : 0;

            this.populateSourceObjectCollection(
                sourceObjects,
                parentArtboardsMap,
                generatorSettings,
                {
                    isDocumentPSD: this._isDocumentPSD(docinfo),
                    documentExtension: this._getFileExtension(docinfo)
                }
            );

            this.updateLayersLoading();
            this.layerCollection.renameFileConflicts();
            this.layerCollection.listenForFileConflicts();    

            var assets = this.layerCollection.map(function (x) { return x.layerSettings; });
            assets.forEach(function (asset) {
                asset.enforceMaxDimensions();
                asset.generatePreview();
            });

            this.trigger("docinfo-loaded", docinfo);
            this.layerCollection.trigger("docinfo-loaded", docinfo);

            if (sourceObjects.length < psSelectionLength &&
                this.get("exportKind") === ExportKind.Selection) {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.EXPORTING_FEWER_THAN_SELECTED);
            }
        }.bind(this)).catch(function (error) {
            CremaGlobal.window.console.warn(error);
            CremaGlobal.window.console.log("stack -> " + error.stack);
        });
    },
    _getSourceObjectsForExport: function (docinfo, parentArtboardsMap) {
        switch (this.get("exportKind")) {
            case ExportKind.Document:
                // We're exporting the document itself.
                return [docinfo];
            case ExportKind.DocumentWithArtboards:
                // If the doc has artboards, export them; else export the document.
                return DocinfoUtils.getArtboards(docinfo);
            default:
                return DocinfoUtils.getLayersForExport(docinfo, parentArtboardsMap);
        }
    },
    isExportDisabled: function () {
        // The exportable items are available after the docinfo comes in. Before it comes in, we still want users to be
        // able to hit the Export button if they don't want to wait for docinfo to load. Similarly for previews, we
        // let users export while previews are in flight. Yes, they may all come back as errors, and the export
        // shouldn't have been allowed, but that's the tradeoff we make to be able to export before previews come in.
        return this.layerCollection.hasDisplayableItems() && this.layerCollection.every(function (genableModel) {
            return genableModel.layerSettingsDisabled();
        });
    },
    reset: function () {
        var docSettings = {},
            generatorSettings = {
                docSettings: docSettings,
                assetSizes: []
            };
        
        this.layerCollection.reset();
        DocSettings.reset();
        this.set("docWidth", 0);
        this.set("docHeight", 0);
        this.set("dpi", 72);
        this.set("docFilepath", "");
        this.set("docGeneratorSettings", generatorSettings);
    },
    reloadGenerator: function () {
        this.reset();
        return this.loadGenerator(true);
    },
    updateLayersLoading: function () {
        var loading = !!this.layerCollection.findWhere({settingsLoading: true});
        this.set("layersLoading", loading);
    }
    
    
});

module.exports = GeneratorModel;
