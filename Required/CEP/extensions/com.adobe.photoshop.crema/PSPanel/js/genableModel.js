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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true, node: true */

"use strict";

var _ = require("underscore"),
    Backbone = require("backbone"),
    CremaGlobal = require("./cremaGlobal.js"),
    BoundsUtils = require("shared/BoundsUtils"),
    ServerInterface = require("./serverInterface.js"),
    LayerNameParser = require("./utils/LayerNameParser.js"),
    DocSettings = require("./docSettings.js"),
    ActionRollup = require("./actionRollup.js"),
    AssetSizeCollection = require("./assetSizeCollection.js"),
    GenSettingsModel = require("./genSettingsModel.js");

/*
 * Base class for layerModel, and any other exportable
*/

var GenableModel = Backbone.Model.extend({
    
    defaults: function () {
        return {
            guid: "",
            layerId: "",
            name: "",
            //this is used for views
            selected: false,
            //isActive is the model communication
            isActive: false,
            //meta-value for tracking all errors to see if they prevent export
            exportable: true,
            isDocument: false,
            layerSettings: new GenSettingsModel(),
            dimensions: {width: -1, height: -1},
            boundsAreAccurate: false,
            settingsLoading: false,
            dpi: 72,
            overMaxSize: false
        };
    },
    thumbnailRoute: "layerthumb/",
    initialize: function (attributes, options) {
        options = options || {};
        attributes = attributes || {};
        this.layerSettings = this.get("layerSettings");
        this.layerSettings.setMaxPixels(this.get("maxSupportedPixels"));
        if (attributes.totalMaskBounds) {
            this.set("dimensions", this._getDimensions(attributes.totalMaskBounds));
        } else if (attributes.bounds) {
            this.set("dimensions", this._getDimensions(attributes.bounds));
        }
        var settings = options.generatorSettings || {},
            assetSettings = (settings.generateItems && settings.generateItems.length) ? settings.generateItems : options.docSettings;
        this.assetSizeCollection = settings.assetSizeCollection || new AssetSizeCollection();
        this.resetSettings(assetSettings, options.defaultSettings);
        this._updateExportable();
        this.updateExportAlert();
        
        this.listenTo(this, "change:artboardEmpty change:groupEmpty change:layerEmpty change:outsideDocumentBounds", this._updateExportable);

        this.listenToOnce(this.layerSettings, "change:loading", this.updateToAccurateBounds);
        this.listenTo(this.layerSettings, "change", this.persistModelSettings);
        this.listenTo(this.layerSettings, "change:file", this.relayFileChange);
        this.listenTo(this.layerSettings, "change:disabled", this.trigger.bind(this, "change:layerSettingsDisabled"));
        this.listenTo(this.layerSettings, "change:loading", this.updateSettingsLoading);
        this.listenTo(this.layerSettings, "change:scale change:canvasWidth change:canvasHeight change:originalDimensions", this.updateExportAlert);
        this.listenTo(this.assetSizeCollection, "maxScaleUpdated", this.updateExportAlert);
        this.listenTo(this, "change:dimensions", this.updateLayersSettingsOriginalDimensions);
        this.listenTo(this.layerSettings, "change:selected", this.updateSettingSelectedState);
        
        this.updateSettingsLoading();
    },
    destroy: function () {
        //we don't want to actually delete, just pretend
        //we need to keep it in the collection in case they change their mind
        this.set({
            isActive: false,
            selected: false
        });
        //TBD: drive this on being the default layer, not on collection
        if (this.collection) {
            this.collection.trigger("remove", this, this.collection, {
                index: this.collection.indexOf(this)
            });
        }
    },
    initLayerSettingsBaseNames: function (name) {
        var settings = this.get("layerSettings");
        if (settings) {
            settings.setBaseName(name || this.get("name"));
        }
        
        this.persistModelSettings();
    },
    _getDimensions: function (bounds) {
        var clippedBounds = {
                top: Math.max(0, bounds.top),
                left: Math.max(0, bounds.left),
                right: Math.max(0, bounds.right),
                bottom: Math.max(0, bounds.bottom)
            },
            clipWidth = this.get("docWidth"),
            clipHeight = this.get("docHeight"),
            parentArtboardBounds = this.get("parentArtboardBounds");
        
        if(parentArtboardBounds) {
            clippedBounds.left = Math.max(parentArtboardBounds.left, clippedBounds.left);
            clippedBounds.top = Math.max(parentArtboardBounds.top, clippedBounds.top);
            clippedBounds.right = Math.min(parentArtboardBounds.right, clippedBounds.right);
            clippedBounds.bottom = Math.min(parentArtboardBounds.bottom, clippedBounds.bottom);
        }
        
        if (clipWidth) {
            clippedBounds.left = Math.max(0, clippedBounds.left);
            clippedBounds.right = Math.min(clipWidth, clippedBounds.right);
        }
        if (clipHeight) {
            clippedBounds.top = Math.max(0, clippedBounds.top);
            clippedBounds.bottom = Math.min(clipHeight, clippedBounds.bottom);
        }

        var clippedHeight = clippedBounds.bottom - clippedBounds.top,
            clippedWidth = clippedBounds.right - clippedBounds.left;

        if (clippedHeight <= 0 || clippedWidth <= 0) {
            clippedHeight = 0;
            clippedWidth = 0;
        }

        return {
            height: clippedHeight,
            width: clippedWidth
        };
    },
    isLayerDataBoundsAccurate: function (rawLayerData) {
        return BoundsUtils.isLayerDataBoundsAccurate(rawLayerData);
    },
    updateToAccurateBounds: function () {
        if (this.get("boundsAreAccurate")) {
            return;
        }
        this._requestAccurateBounds(this.get("docId"), this.get("layerId"))
            .then(function (exactbounds) {
                this.set({bounds: exactbounds,
                          boundsAreAccurate: true,
                          dimensions: this._getDimensions(exactbounds)});
            }.bind(this));
    },
    _requestAccurateBounds: function (documentId, layerId) {
        return ServerInterface.sendCommand("getExactLayerBounds", {
            docId: documentId,
            layerId: layerId
        })
        .catch(function (e) {
            CremaGlobal.window.console.error("Error in ServerInterface.sendCommand(\"getExactLayerBounds\"):", e);
        });
    },
    getBaseName: function () {
        return this.calcBaseName(this.get("name"));
    },
    
    cleanBaseName: function (dirtyName) {
        
        var name = dirtyName.trim(),
            nameRefactor,
            extraTextPos,
            extPos,
            extVal;
        
        //change layer.png XXX -> layer XXX.png
        //for example: layer.png copy -> layer copy.png
        //look for a word and optionally digits following a space and at the end of the name
        //for i18n just assume anything over normal ascii is a word for file name purposes
        extraTextPos = name.search(/\s+([A-Za-z\u00A0-\uFFFF]+)\d*$/);
        if (extraTextPos > 0) {
            nameRefactor = name.substring(0, extraTextPos);
            extPos = nameRefactor.search(/\.\D{3}$/);
            if (extPos > 0) {
                //see if it is a valid extension, if not just eat the space b4 the copy
                extVal = nameRefactor.substring(extPos + 1);
                if (extVal && GenSettingsModel.prototype.extensionSupported(extVal.toLowerCase())) {
                    name = nameRefactor.substring(0, extPos) + name.substring(extraTextPos) + nameRefactor.substring(extPos);
                } else {
                    
                    name = nameRefactor.substring(0, extPos) + "_" + extVal + "_" + name.substring(extraTextPos + 1);
                }
            }
        }
        
        //remove any combination of . that doesn't leave a pattern of .{word} left
        name = name.replace(/(\.)+(?!\w)/g, "_");
        
        //these things can confuse layer name parser because they are delimters
        name = name.replace(/[+,*\\>?!:|<]/g, "_");
        
        //totally ditch quotes...
        name = name.replace(/['"]/g, "");
        
        //ditch any space after a path delimeter
        name = name.replace(/\/\s+/g, "/");
        
        //we can't abide layer names that === well known extensions
        if (GenSettingsModel.prototype.extensionSupported(name.toLowerCase())) {
            name = "_" + name;
        }
        
        //leaving '/' in intentionally since its valid to have folders in the list
        
        return this.calcBaseName(name, true);
    },
    
    calcBaseName: function (name, enoughCleaning) {
        var parsed,
            baseName,
            parseFailed,
            lastParsedItem;
        
        if (name) {
            name = name.trim();
            
            //the goal is to get a baseName that will produce good layer syntax

            try {
                parsed = LayerNameParser.parse(name);
            } catch (err) {
                this.layerNameParseError = true;
                CremaGlobal.window.console.log("error parsing layer name", name, err);
            }

            //we really need to check the whole list to see if it got a sane set parsed...
            
            if (parsed) {
                _.any(parsed, function (parsedItem) {
                    lastParsedItem = parsedItem;
                    if (!parsedItem.extension || !parsedItem.file ||
                            parsedItem.file === parsedItem.extension ||
                            !GenSettingsModel.prototype.extensionSupported(parsedItem.extension)) {
                        parseFailed = true;
                        return true;
                    } else if (!baseName) {
                        baseName = parsedItem.file.slice(0, -1 * (parsedItem.extension.length + 1));
                    }
                });
                
                if (!parseFailed && baseName) {
                    return baseName;
                }
            }
            if (!enoughCleaning) {
                name = this.cleanBaseName(name, false);
            }
            return name;
        }
        return "";
    },    
    getLayerNameSerializedSettings: function () {
        var genSettings = this.get("layerSettings"),
            layerName = "";
        if (genSettings) {
            layerName = genSettings.serializeToLayerName();
        } else {
            //in theory, we can only reach this point if we have 0 settings but the psd has a layername with extension
            layerName = this.getBaseName();
        }
        return layerName;
    },
    toJSON: function (options) {
        if (options && options.generatorSettings) {
            var genSettings = this.get("layerSettings");
            return genSettings && genSettings.toJSON(options);
        }
        return Backbone.Model.prototype.toJSON.call(this, options);
    },
    getActiveSelection: function () {
        if (this.get("selected")) {
            return this;
        }
        return undefined;
    },
    getActivePreview: function () {
        return this.get("layerSettings");
    },
    persistModelSettings: function () {
        this._persistModelSettingsAsMetaData();
    },
    _updateModelMetaData: function(json) {
        ActionRollup.updateLayerMetaData(this.get("layerId"), {assetSettings: json});
    },
    _persistModelSettingsAsMetaData: function () {
        // "layerSettings" were originally a collection, but now there can only be a single
        // settings model. For backward compatibility, continue to store as an array.
        this._updateModelMetaData([this.toJSON({generatorSettings:true})]);
    },
    isActive: function () {
        return this.get("selected") || this.layerSettings.get("selected");
    },
    deselectAll: function () {
        this.set({selected: false, isActive: false});
    },
    emptyState: function () {
    },
    resetSettings: function (settings, defaultSettings) {
        this.layerSettings.clear();
        var finalSettings = defaultSettings || _.result(this.get("layerSettings"), "defaults"),
            importingGeneratorSettings = false;
        if (settings && settings.length) {
            // "layerSettings" were originally a collection, but now there can only be a single settings model.
            finalSettings = _.extend(finalSettings, settings[0]);
            importingGeneratorSettings = true;
        } else {
            finalSettings = _.extend(finalSettings, {
                baseName: this.get("name"),
            }, settings);
        }
        this.addLayerSettings(finalSettings, importingGeneratorSettings);
    },
    addLayerSettings: function (settings, importingGeneratorSettings) {
        var genKeys = [];
        if (importingGeneratorSettings && settings) {
            //some settings were unintentionally written with internal only data, remove the ones that will mess us up here
            settings = _.omit(settings, this.layerSettings.internalOnlyKeys);
            genKeys = _.keys(settings);
        }
        settings = _.extend(settings || {}, {
            documentId: this.get("docId"),
            sourceObjectId: this.get("layerId"),
            originalDimensions: _.extend(this.get("dimensions"), {dpi: this.get("dpi")}),
            importedGeneratorKeys: genKeys
        });
        this.layerSettings.set(settings);
        return this.layerSettings;
    },
    updateLayersSettingsOriginalDimensions: function () {
        var newDim = _.extend(this.get("dimensions"), {dpi: this.get("dpi")});
        this.layerSettings.set("originalDimensions", newDim);
    },
    updateSettingSelectedState: function (layerSetting) {
        var modelSelected = layerSetting.get("selected"),
            previousCid, previousSelected,
            selected = this.get("selected");
        
        if (modelSelected) {
            previousCid = this.layerSettings.get("cid");
            previousSelected = this.layerSettings.get("selected") && previousCid && (previousCid !== layerSetting.cid);

            if (previousSelected) {
                this.layerSettings.set("selected", false);
            }
            selected = false;
        }
        this.set({selected: selected});
        this.set({isActive: this.isActive()}, {silent: true});
        this.trigger("change:isActive", this);
    },
    layerSettingsDisabled: function () {
        return this.layerSettings.get("disabled");
    },
    getGenableId: function () {
        return this.get("layerId");
    },
    
    relayFileChange: function (layerSetting) {
        this.trigger("change:file", layerSetting);
    },
    
    updateModelBacking: function () {
        CremaGlobal.window.console.warn("updatemodel backing called, track it down");
        //this.set("imageURL", ServerInterface.SERVER_HOST + ':' + ServerInterface.getCachedCremaPort() + '/' + this.thumbnailRoute + this.getGenableId() + ".png");
    },
    updateSettingsLoading: function () {
        var loading = !!this.layerSettings.get("loading");
        this.set("settingsLoading", loading);
    },
    _updateExportable: function () {
        var exportable = !this.get("artboardEmpty") &&
                         !this.get("groupEmpty") &&
                         !this.get("layerEmpty") &&
                         !this.get("outsideDocumentBounds");
        this.set("exportable", exportable);
    },
    scaleExceedMaxImageLimit: function (scale) {

        var maxImageDimensions = this.layerSettings.getMaxImageDimensions();
        if(!maxImageDimensions) {
            return false;
        }

        if( this.layerSettings.get("scale") * scale * 100 > this.layerSettings.getMaxScale() ||
            this.layerSettings.get("canvasWidth") * scale > maxImageDimensions.width ||
            this.layerSettings.get("canvasHeight") * scale > maxImageDimensions.height) {
            return true;
        } else {
            return false;
        }
    },    
    updateExportAlert: function () {        
        var maxScaleVal = (this.assetSizeCollection && this.assetSizeCollection.maxAssetSizeScale) || 0;
        this.set("overMaxSize", this.scaleExceedMaxImageLimit(maxScaleVal));
    },
    getSizesExceedingLimit: function () {
        var scaleArray = this.assetSizeCollection.pluck("scale");
        scaleArray = _.filter(scaleArray.sort(), function(num) { 
            return this.scaleExceedMaxImageLimit(num); 
        }.bind(this) );
        return (_.map(scaleArray, function(num){ return num + "x"; })).join(', ');
    }

});

module.exports = GenableModel;
