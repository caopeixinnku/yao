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
/*global define: true, graphite: true, require: true, module: true */
"use strict";

var Backbone    = require('backbone'),
    _           = require("underscore"),
    Headlights  = require("./utils/Headlights"),
    Inputs      = require("./utils/inputs"),
    Path        = require("path"),
    ExportKind  = require("./exportKind.js"),
    FilePathSanitizer = require("shared/FilePathSanitizer");



var GenableCollection = Backbone.Collection.extend({
    currentSelection: null,
    hasBackground: false,
    initialize: function (models, options) {
        this.listenTo(this, "change:isActive", this.updateActiveStates);
        this.listenTo(this, "change:selected", this.updateSelectedStates);
        this.listenTo(this, "add", this.checkForBackgroundLayer);        
        this.listenTo(this, "remove", this.selectNext);
        this.listenTo(this, "reset", this.resetBackgroundLayerFlag);
        this.listenTo(this, "add remove reset", this.checkForInitialSelection);
        this.headlightsAssetGroup = (options && options.headlightsGroup) || Headlights.EXPORT_ASSETS_GROUP;
    },
    listenForFileConflicts: function () {
        this.listenTo(this, "add remove reset change:file", this.renameFileConflicts);
    },
    stopListeningForFileConflicts: function () {
        this.stopListening(this, "add remove reset change:file", this.renameFileConflicts);
    },
    resetBackgroundLayerFlag: function () {
        this.hasBackground = false;
        this.trigger("background-layer-status-change");
    },
    checkForBackgroundLayer: function (model) {
        if (model.get("layerType") === "backgroundLayer") {
            this.hasBackground = true;
            this.trigger("background-layer-status-change");
        }
    },
    getActiveSelection: function () {
        var activeModel = this.findBy("isActive", true);
        return activeModel ? activeModel.getActiveSelection() : null;
    },
    selectNext: function (model, collection, options) {
        if (model.get("layerType") === "backgroundLayer") {
            this.hasBackground = false;
            this.trigger("background-layer-status-change");
        }
        if (model.previousAttributes().selected && this.size() > 0) {
            var currentIndex = this.map(function(item) { return item.cid; }).indexOf(model.cid),
                index = currentIndex === (this.size() - 1) ? --currentIndex  : ++currentIndex,
                newModel = this.at(index);

            if (newModel) {
                newModel.set({ isActive: true, selected: true });
            }
        }
    },
    hasDisplayableItems: function () {
        return this.length > 0;
    },
    _getSettingsFromLayerArray: function(arrayOfLayerModels) {
        var getLayerSettings = function (layerModel) {
            var settings = layerModel.get("layerSettings");
            if (!settings) {
                return;
            }
            return settings;
        };
        
        var layerSettingsArray = _.map(arrayOfLayerModels, getLayerSettings),
            emptySettingsRemoved = _.compact(layerSettingsArray);
        
        return emptySettingsRemoved;
    },
    getSettings: function (properties) {
        return this._getSettingsFromLayerArray(this.where(properties));
    },
    getAllSettings: function () {
        return this._getSettingsFromLayerArray(this.toArray());
    },
    getSelectedExportableSettings: function () {
        var selectedAndExportable = this.where({selected: true, exportable:true});
        return this._getSettingsFromLayerArray(selectedAndExportable);
    },
    getConflictedFileSettings: function (allSettings) {
        var normalizedFile = function (setting) {
            var file = setting.get("file");
            return file && file.toLowerCase();
        };
        
        var allFiles = _.compact(_.map(allSettings, normalizedFile)),
            fileCount = _.countBy(allFiles, _.identity);
        
        var settingHasDupeFile = function (settingsModel) {
            return fileCount[normalizedFile(settingsModel)] > 1;
        };
        return _.filter(this.getAllSettings(), settingHasDupeFile);
    },
    
    updateFileConflicts: function () {
        var allSettings = this.getAllSettings(),
            conflicts = this.getConflictedFileSettings(allSettings),
            nonConflicted = _.difference(allSettings, conflicts);
        _.invoke(nonConflicted, "set", "namesConflict", false);
        _.invoke(conflicts, "set", "namesConflict", true);
    },
    
    renameFileConflicts: function () {
        var createKeyedSetting = function(setting, index) {
            return { id: index,
                     name: setting.getBaseName(),
                     extension: setting.getFileExtension(),
                     setting: setting };
        };
        
        var applySanitizedSettings = function (sanitizeMap, keyedSetting) {
            var newVal = sanitizeMap[keyedSetting.id];
            if (newVal !== keyedSetting.name) {
                keyedSetting.setting.setBaseName(newVal);
            }
        };
        
        var layerHasASetting = function(settings, layer) {
            var layerSettings = layer.get("layerSettings");
            return layerSettings && _.some(settings, function (setting) {
                    return layerSettings.get(setting);
                }, layerSettings);
        };
        
        var allSettings = this.getAllSettings(),
            conflictSettings = this.getConflictedFileSettings(allSettings),
            conflictLayers = this.filter(_.partial(layerHasASetting, conflictSettings)),
            settingToSanitize = _.map(allSettings, createKeyedSetting),
            sanitizedMap = FilePathSanitizer.createSanitizedUniqueLayerBasenamesMap(settingToSanitize);
        _.each(settingToSanitize, _.partial(applySanitizedSettings, sanitizedMap));
    },
    updateActiveStates: function (model) {
        if (model.get("isActive")) {
            model.set("selected", true);
            this.trigger("change:currentSelection", model);
        }
        if (!this.ensureActiveSelection(model)) {
            model.set({isActive: true, selected: true});
        }
    },
    updateSelectedStates: function (model) {        
        if(!this.ensureActiveSelection(model)) {
            model.set({isActive: true, selected: true});
        }
    },
    checkForInitialSelection: function() {
        if(this.length > 0 && !this.ensureActiveSelection()) {
            this.at(0).set({isActive: true, selected: true});
        }
    },
    modelIsSelected: function (model) {
        return model.get("selected");
    },
    areAllItemsSelected: function () {
        return this.every(this.modelIsSelected);
    },
    selectAll: function () {
        this.invoke("set", "selected", true);
    },
    selectActiveOnly: function() {
        this.selectOnly(this.findWhere({isActive: true}));
    },
    selectOnly: function (model) {
        model.set({isActive: true, selected: true});
        var otherModels = this.without(model);
        _.invoke(otherModels, "deselectAll");
    },
    toggleSelection: function (model) {
        var selected = model.get("selected");
        model.set({isActive: !selected, selected: !selected});
    },
    selectRange: function (model1, model2, additive) {
        var index1 = this.indexOf(model1),
            index2 = this.indexOf(model2),
            lowIndex = Math.min(index1, index2),
            highIndex = Math.max(index1, index2),
            selectRange = this.slice(lowIndex, highIndex+1),
            remainder = this.slice(0, lowIndex).concat(this.slice(highIndex+1));
        
        _.invoke(selectRange, "set", "selected", true);
        if (!additive) {
            _.invoke(remainder, "deselectAll");
        }
    },
    selectExclusiveRangeTo: function (model) {
        this.selectRange(this.findWhere({isActive: true}), model);
    },
    selectAdditiveRangeTo: function (model) {
        this.selectRange(this.findWhere({isActive: true}), model, true);
    },
    ensureActiveSelection: function (possibleSelection) {
        if (possibleSelection && possibleSelection.get("isActive") && 
            possibleSelection.get("selected")) {
            _.invoke(this.without(possibleSelection), "set", "isActive", false);
            return true;
        }
        var validActive = this.findWhere({isActive: true, selected: true}),
            firstSelection = this.findWhere({selected: true});
        if (validActive) {
            _.invoke(this.without(validActive), "set", "isActive", false);
            return true;
        }
        if (firstSelection) {
            firstSelection.set("isActive", true);
            _.invoke(this.without(firstSelection), "set", "isActive", false);
            return true;
        }
        return false;
    },
    hasBackgroundLayer: function () {
        return this.hasBackground;
    },
    findBy: function (fieldName, id) {
        var findObj = {};
        findObj[fieldName] = id;
        return this.findWhere(findObj);
    },
    
    //multiselect settings getters and setters
    getSettingsValue: function (settings, prop) {
        if (!settings.length) {
            return undefined;
        }
        var val = _.first(settings).get(prop),
            allMatch = _.every(settings, function (model) {
                return _.isEqual(model.get(prop), val);
            });
        return allMatch ? val : Inputs.INDETERMINATE_VALUE;
    },
    
    getSelectedExportableSettingsValue: function (prop) {
        return this.getSettingsValue(this.getSelectedExportableSettings(), prop);
    },
    
    getSettingsFirstTruthyValue: function (settings, prop) {
        var first = _.find(settings, function (model) {
                return model.get(prop);
            });
        return first && first.get(prop);
    },
    
    setSettingsValue: function (settings, prop, val, options) {
        _.invoke(settings, "set", prop, val, options);
    },
 
    setSelectedExportableSettingsValue: function (prop, val, options) {
        this.setSettingsValue(this.getSelectedExportableSettings(), prop, val, options);
    },
    
    unsetSettingsValue: function (settings, prop, options) {
        _.invoke(settings, "unset", prop, options);
    },
    
    unsetSelectedExportableSettingsValue: function (prop, options) {
        this.unsetSettingsValue(this.getSelectedExportableSettings(), prop, options);
    },
    
    getSettingsMaxScale: function (settings) {
        var maxScalesRaw = _.invoke(settings, "getMaxScale"),
            maxScalesNumbers = _.filter(maxScalesRaw, _.isFinite);
        return maxScalesNumbers.length ? Math.min.apply(null, maxScalesNumbers) : undefined;
    },
    
    getSelectedExportableSettingsMaxScale: function () {
        return this.getSettingsMaxScale(this.getSelectedExportableSettings());
    },
    
    getCurrentImageDimensions: function (settings, actualPreviewSize) {
        var method = actualPreviewSize ? "getPreviewDimensions": "getNaturalImageDimensions",
            dimensions =  _.invoke(settings, method),
            firstDimension = dimensions.pop(),
            allMatch = _.every(dimensions, _.partial(_.isEqual, firstDimension));
        return allMatch ? firstDimension : Inputs.INDETERMINATE_VALUE;
    },
    
    getSelectedExportableNaturalImageDimensions: function () {
        return this.getCurrentImageDimensions(this.getSelectedExportableSettings());
    },
    
    getSelectedExportableImageDimensions: function () {
        return this.getCurrentImageDimensions(this.getSelectedExportableSettings(), true);
    },

    getSettingsMaxImageDimensions: function (settings) {
        var dimensions = _.invoke(settings, "getMaxImageDimensions"),
            widthsRaw = _.pluck(dimensions, "width"),
            heightsRaw = _.pluck(dimensions, "height"),
            widths = _.filter(widthsRaw, _.isFinite),
            heights = _.filter(heightsRaw, _.isFinite);
        return widths.length && heights.length ? 
            {width: Math.min.apply(null, widths), height: Math.min.apply(null, heights)} : undefined;
    },
    
    getSelectedExportableMaxImageDimensions: function () {
        return this.getSettingsMaxImageDimensions(this.getSelectedExportableSettings());
    },

    logAssetSummary: function (itemType, exportCount, seconds) {
        Headlights.accumulateData(Headlights.EXPORTTYPE, Headlights.DIALOG);
        Headlights.accumulateData(Headlights.ITEMTYPE, itemType);
        Headlights.accumulateData(Headlights.ITEMCOUNT, exportCount);
        Headlights.accumulateData(Headlights.SECONDS, seconds);
        Headlights.logAccumulatedData(Headlights.EXPORT_SUMMARY_GROUP);
    },

    logDataForOneAsset: function (oneAssetModel, itemType) {
        var format = oneAssetModel.get("extension"),
            quality = oneAssetModel.get("quality"),
            interp = oneAssetModel.get("interpolationType"),
            scale = oneAssetModel.get("scale"),
            originalDim = oneAssetModel.get("originalDimensions"),
            imageWidth = Math.round(originalDim.width * scale),
            imageHeight = Math.round(originalDim.height * scale),
            canvasWidth = oneAssetModel.get("canvasWidth"),
            canvasHeight = oneAssetModel.get("canvasHeight"),
            assetWidth = canvasWidth ? canvasWidth : imageWidth,
            assetHeight = canvasHeight ? canvasHeight : imageHeight,
            canvasSpecified = !!(canvasWidth || canvasHeight),
            metadata = (oneAssetModel.get("metadataType") === "none") ? Headlights.NONE : Headlights.COPY_AND_CONTACT,
            convertColorSpace = !!oneAssetModel.get("useICCProfile");

        Headlights.accumulateData(Headlights.EXPORTTYPE, Headlights.DIALOG);
        Headlights.accumulateData(Headlights.ITEMTYPE, itemType);
        Headlights.accumulateData(Headlights.INTERP, interp);
        Headlights.accumulateData(Headlights.SCALE, scale);
        Headlights.accumulateData(Headlights.WIDTH, assetWidth);
        Headlights.accumulateData(Headlights.HEIGHT, assetHeight);
        Headlights.accumulateData(Headlights.CANVAS, canvasSpecified);
        Headlights.accumulateData(Headlights.METADATA, metadata);
        Headlights.accumulateData(Headlights.CONVERT_CS, convertColorSpace);

        if (format === "png" && quality !== "100") {
            format += quality;
        } else if (format.substr(0,4) === "png-") {
            format = format.replace("-", "");
        }

        Headlights.accumulateData(Headlights.FORMAT, format);

        if (format === "jpg") {
            quality = parseInt(quality);
            Headlights.accumulateData(Headlights.QUALITY, quality);
        }

        // log accumulated data for this asset
        Headlights.logAccumulatedData(this.headlightsAssetGroup);
    },
    
    logDataForOneLayer: function (layer, itemType) {
        var layerSettings = layer.get("layerSettings");
        this.logDataForOneAsset(layerSettings, itemType);
    },

    logExportedAssetData : function (exportKind, seconds) {
        var docLayer,
            exportedLayers,
            itemType = Headlights.SELECTION;

        if (exportKind === ExportKind. Document) {
            docLayer = this.findBy("isDocument", true);
            itemType = Headlights.DOCUMENT;
            this.logAssetSummary(itemType, 1, seconds);
            this.logDataForOneLayer(docLayer, itemType);
        } else {
            if (exportKind === ExportKind.DocumentWithArtboards) {
                itemType = Headlights.ARTBOARD;
                exportedLayers = this.where({isArtboard: true});
            } else {
                itemType = Headlights.SELECTION;
                exportedLayers = this;
            }
            this.logAssetSummary(itemType, exportedLayers.length, seconds);
            exportedLayers.forEach(function (layer) {
                this.logDataForOneLayer(layer, itemType);
            }.bind(this));
        }
    }
    
});

module.exports = GenableCollection;
