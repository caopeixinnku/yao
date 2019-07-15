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
    Headlights = require("./utils/Headlights"),
    FilePathSanitizer = require("shared/FilePathSanitizer"),
    MaxPixels = require("shared/MaxPixels"),
    Constants = require("shared/Constants"),
    Path = require("path"),
    rounder = require("./rounder"),
    Strings         = require("./LocStrings"),
    ServerInterface = require("./serverInterface");

/*
 * Settings for a single generated asset
*/

var _supportedExtensions,
    _maxPixels,
    _currentId = 0;

var _extensionToSupportedMap = {
    "jpg": "jpg",
    "jpeg": "jpg",
    "gif": "gif",
    "png": "png",
    "svg": "svg"
};

var GenSettingsModel = Backbone.Model.extend({

    defaults: function () {
        return {
            documentId: null,
            sourceObjectId: null,
            file: "",
            name: "",
            extension: "png",
            quality: "100",
            scale: 1,
            disabled: false,
            selected: false,
            interpolationType: "bicubicAutomatic",
            imageURL: "",
            fileSize: 0,
            loading: true,
            metadataType: "none",
            useICCProfile: Constants.SRGB_COLOR_PROFILE,
            embedICCProfile: false,
            originalDimensions: {width: -1, height: -1},
            previewDimensions: null,
            importedGeneratorKeys: [],
            lastPreviewComponent: null,
            lastReceivedPreviewTimestamp: 0
        };
    },    

    $previewImg: Backbone.$(),

    createNewAssetId: function () {
        _currentId += 1;
        return _currentId;
    },
    
    generatorSettingsKeys: ["file", "name", "folders", "extension", "quality", "interpolationType",
                            "metadataType", "scale", "height", "heightUnit", "width", "widthUnit",
                            "canvasWidth", "canvasHeight", "useICCProfile", "embedICCProfile"],
    
    internalOnlyKeys: ["documentId", "sourceObjectId", "disabled", "selected", "imageURL",
                       "originalDimensions", "previewDimensions", "importedGeneratorKeys",
                       "loading", "fileSize", "lastPreviewComponent",
                       "lastReceivedPreviewTimestamp"],
    
    resetBaselineSupportedExtensions: function () {
        _supportedExtensions = ['png', 'png-8', 'png-24', 'png-32', 'gif', 'jpg', 'svg'];
    },
    
    isSupported: function () {
        var ext = this.get("extension");
        return this.extensionSupported(ext);
    },
    extensionSupported: function (ext) {
        return (_supportedExtensions.indexOf(ext) >= 0);
    },
    getMaxPixels: function () {
        return _maxPixels || MaxPixels.getMaxPixels();
    },
    setMaxPixels: function (maxSupportedPixels) {
        _maxPixels = maxSupportedPixels;
    },
    // For testing.
    resetMaxPixels: function () {
        _maxPixels = undefined;
    },
    initialize: function () {

        this.$previewImg = Backbone.$("<img>");
        
        if (this.get("baseName")) {
            this.setBaseName(this.get("baseName"));
            this.unset("baseName");
        }
        
        this.applyBlacklistToImportedKeys();

        var rerenderEvents = [
            "change:extension",
            "change:quality",
            "change:interpolationType",
            "change:scale",
            "change:canvasWidth",
            "change:canvasHeight",
            "change:useICCProfile",
            "change:embedICCProfile"
        ];
        
        this.listenTo(this, rerenderEvents.join(" "), this.generatePreview);
        this.listenTo(this, "change:quality", this.normalizeQualityToString);
        this.listenTo(this, "change:imageURL", this.updatePreviewDimensions);
        this.listenTo(this, "change:scale", this.clearPreviewDimensions);
    },
    setBaseName: function (baseName) {
        this._normaliseExtension();
        var fileName = FilePathSanitizer.sanitize(baseName),
            ext = this.get("extension");
        if (ext && fileName.indexOf("." + ext) === -1) {
            fileName = fileName + "." + ext;
        }
        this.set("file", fileName);
    },
    getBaseName: function () {
        var file = this.get("file"),
            ext = this.get("extension");
        return Path.basename(file, "." + ext);
    },
    getFileExtension: function () {
        var ext = this.get("extension");
        return ext ? ext.replace(/png-\d+$/, "png") : "";
    },
    getFileName: function () {
        var file = this.get("file");
        return file ? file.replace(/png-\d+$/, "png") : "";
    },
    _normaliseExtension: function() {
        var userExtension = _extensionToSupportedMap[this.get("extension").toLowerCase()] || this.defaults().extension;
        this.set("extension", userExtension);
    },
    serializeSize: function (w, h, unitW, unitH) {
        if (!this.isSupported()) {
            return "";
        }
        var wNum = parseFloat(w),
            hNum = parseFloat(h);
        var output = "";
        if (!isNaN(wNum) || !isNaN(hNum)) {
            if (isNaN(wNum)) {
                w = "?";
            }
            if (isNaN(hNum)) {
                h = "?";
            }
            if (unitW && unitW !== "" && unitW !== "px") {
                w += unitW;
            }
            if (unitH && unitH !== "" && unitH !== "px") {
                h += unitH;
            }
            if (unitW === "%") {
                output += w + " ";
            } else {
                output += w + "x" + h + " ";
            }
        }
        return output;
    },
    
    getValidQuality: function (ext, quality) {
        var qualityInt = parseInt(quality, 10);
        if (isNaN(qualityInt)) {
            return;
        }
        if (ext === "png") {
            //valid png quality numbers are 8,24,32, all others will use default "png"
            if (qualityInt === 8 || qualityInt === 24 || qualityInt === 32) {
                return qualityInt;
            }
        } else if (ext === "png-8") {
            return 8;
        } else if (ext === "png-24") {
            return 24;
        } else if (ext === "png-32") {
            return 32;
        } else if (ext === "jpg" || ext === "webp") {
            // A valid quality is a value between 0 and 100.  The value is serialized to work correctly with generator
            if (qualityInt >= 0 && qualityInt <= 100) {
                return qualityInt;
            }
        }
        return;
    },
    
    serializeQuality: function (ext, quality) {
        var output = "",
            qualityInt = this.getValidQuality(ext, quality);
        if (isNaN(qualityInt)) {
            return output;
        }
        if (ext === "png") {
            output += "-" + qualityInt;
        } else if (ext === "jpg" || ext === "webp") {
            output += "-" + qualityInt + "%";
        }
        return output;
    },

    // Encode characters in the given path that generator would choke on.
    // Currently, '%' is the only one; no other characters seem to be a problem.
    encode: function (path) {
        return path.replace(/\%/g, "%25");
    },
    
    getNaturalImageDimensions: function () {
        var dim = this.get("originalDimensions");
        if (!dim) {
            return;
        }
        return _.extend({}, dim, {width: Math.round(dim.width), height: Math.round(dim.height)});
    },
    
    getMaxImageDimensions: function () {
        var dim = this.get("originalDimensions");
        if (!dim) {
            return;
        }
        return _.extend({}, dim, MaxPixels.getMaxDimensions(dim, this.getMaxPixels()));
    },
    
    getPreviewDimensions: function () {
        return this.get("previewDimensions");
    },
    
    getCurrentImageDimensions: function () {
        return this.getPreviewDimensions() || this.getScaledImageDimensions();
    },
    
    getScaledImageDimensions: function () {
        var percent = (this.get("scale") || 1) * 100;
        percent = rounder(percent, 2);
        
        var origDim = this.getNaturalImageDimensions();

        //Calculate the right Scale based on the generator scaling.
        var width = Math.round(origDim.width * percent / 100),
            height = Math.round(origDim.height * percent / 100);  
        
        if (width > height) {
            percent = Math.floor(10000*width/origDim.width)/100;
            height = Math.round(origDim.height * percent / 100);
        } else {
            percent = Math.floor(10000*height/origDim.height)/100;
            width = Math.round(origDim.width * percent / 100);            
        }
        
        return {
            height: height,
            width: width
        };        
    },
    
    getMaxScale: function () {
        if (!this.maxScale) {
            var dim = this.get("originalDimensions");
            if (!dim) {
                return;
            }
            this.maxScale = MaxPixels.getMaxScaleFactor(dim, this.getMaxPixels()) * 100;
        }
        return this.maxScale;
    },
    
    getCanvasDimensions: function () {
        var imgDim = this.getCurrentImageDimensions(),
            w = this.get("canvasWidth"),
            h = this.get("canvasHeight");
        
        return {
            height: Math.round(h || imgDim.height),
            width: Math.round(w || imgDim.width)
        };
    },
    
    hasClippedDimensions: function () {
        var imgDim = this.getCurrentImageDimensions(),
            w = this.get("canvasWidth"),
            h = this.get("canvasHeight");
        
        return (w && imgDim.width > w) ||
                (h && imgDim.height > h) ? true : false;
    },
    
    clearPreviewDimensions: function () {
        this.set("previewDimensions", null);
    },
    
    updatePreviewDimensions: function() {
        var imageURL = this.get("imageURL");
        if (!imageURL || this.$previewImg.attr("src") === imageURL) {
            return;
        }
        this.$previewImg.off();
        this.$previewImg.attr("src", imageURL);
        this.$previewImg.one("load", function() {
            var dim = { width: this.$previewImg[0].naturalWidth,
                        height: this.$previewImg[0].naturalHeight };
            this.set("previewDimensions", dim);
        }.bind(this));
        this.$previewImg.one("error", function() {
            this.set("previewDimensions", null);
        }.bind(this));
    },

    serializeToLayerName: function () {
        
        var output,
            w = this.get("width"),
            h = this.get("height"),
            unitW = this.get("widthUnit"),
            unitH = this.get("heightUnit"),
            quality = this.get("quality"),
            ext = this.get("extension"),
            fileName = this.get("file");
        
        output = this.serializeSize(w, h, unitW, unitH) + fileName + this.serializeQuality(ext, quality);
        
        return output;
    },
    
    applyBlacklistToImportedKeys: function () {
        var curKeys = this.get("importedGeneratorKeys"),
            cleanKeys = _.difference(curKeys, this.internalOnlyKeys);
        this.set("importedGeneratorKeys", cleanKeys);
    },

    toJSON: function (options) {
        var json = Backbone.Model.prototype.toJSON.call(this, options);
        if (options && options.generatorSettings) {
            this.applyBlacklistToImportedKeys();
            var whitelistkeys = this.generatorSettingsKeys.concat(this.get("importedGeneratorKeys") || []);
            json = _.pick(json, whitelistkeys);
            
            json.file = this.getFileName();
            json.extension = this.getFileExtension();
            this._updateQualityForGeneratorSettingsJson(json);
        }
        return json;
    },
    
    _updateQualityForGeneratorSettingsJson: function (json) {
        var qualityInt = this.getValidQuality(this.get("extension"), this.get("quality"));
        if (_.isFinite(qualityInt)) {
            if (json.extension === "jpg" || json.extension === "webp") {
                json.quality = qualityInt + "%";
            } else {
                json.quality = qualityInt;
            }
        } else {
            delete json.quality;
        }
    },

    updatePreviewUrl: function (timestamp, server, previewId, errorOccurred) {
        var changes = {
            loading: false,
            previewId: previewId
        };

        // Ensure the preview that just came in is not older than the one we already have.
        var lastTimestamp = this.get("lastReceivedPreviewTimestamp") || 0;
        if (timestamp >= lastTimestamp) {
            var previewFilename = [previewId, this.getFileExtension()].join("."),
                urlParts = [server, "preview", previewFilename],
                cacheBuster = "?t=" + timestamp;
            changes.imageURL = urlParts.join("/") + cacheBuster;
            changes.disabled = errorOccurred;
            this.set("lastReceivedPreviewTimestamp", timestamp);
        }

        this.set(changes);
    },
    createExportComponent: function (documentId, layerId, filePath, scaleFactor, suffix) {
        var quickExportSpecific, quickExportComponent,
            json = this.toJSON({generatorSettings:true}),
            isPreview = false;

        suffix = suffix || "";
        scaleFactor = scaleFactor || 1;

        if (scaleFactor === 1) {
            isPreview = true;
        } else {
            if (json.hasOwnProperty("canvasHeight")) {
                json.canvasHeight *= scaleFactor;
            }

            if (json.hasOwnProperty("canvasWidth")) {
                json.canvasWidth *= scaleFactor;
            }
        }

        if (json.scale !== 1) {
            scaleFactor = json.scale * scaleFactor;
        }
        
        quickExportSpecific = {
            path: filePath,
            documentId: documentId,
            layerId: layerId,
            basename: this.getBaseName() + suffix,
            scale: scaleFactor
        };
        if (isPreview && !this.get("loading")) {
            quickExportSpecific.isPreview = true;
            quickExportSpecific.previewId = this.get("previewId");
        }
        quickExportComponent = _.extend({}, json, quickExportSpecific);

        return quickExportComponent;
    },

    _createPreviewComponent: function () {
        var component = this.createExportComponent(this.get("documentId"), this.get("sourceObjectId"));
        component.timestamp = new Date().getTime();
        return component;
    },

    /**
     * Ignores the components' timestamps.
     */
    _previewComponentsEqual: function (a, b) {
        return _.isEqual(_.omit(a, "timestamp"), _.omit(b, "timestamp"));
    },

    /**
     * Add a debounced function for generating previews, so that multiple change events in the same browser event
     * loop iteration don't cause multiple renderings.
     */
    generatePreview: function () {
        if (!this._debouncedGeneratePreview) {
            this._debouncedGeneratePreview = _.debounce(this.generatePreviewImmediately, 0);
        }
        this._debouncedGeneratePreview();
    },

    /**
     * Ensure that our scale, canvasWidth, or canvasHeight don't crash generator.
     * Note that if the doc is huge, and we are trying to load the first preview,
     * even a scale of 1 can be too large.
     */
    enforceMaxDimensions: function() {
        // Make sure we have the actual max dimensions from the server before doing the clamping.
        var scale, canvasWidth, canvasHeight,
            maxScaleFactor = this.getMaxScale() / 100,
            maxDim = this.getMaxImageDimensions();

        var _enforceMaxAndLog = function(key, val, max, logKey) {
            if (val > max) {
                Headlights.logEvent(Headlights.CREMA_WARNING, logKey);
                Headlights.logData(Headlights.MAX_EXCEEDED_GROUP, logKey, val);
                val = max;
            }
            this.set(key, val);
        }.bind(this);

        scale = this.get("scale") || 1;
        _enforceMaxAndLog("scale", scale, maxScaleFactor, Headlights.MAX_EXCEEDED_SCALE);

        canvasWidth = this.get("canvasWidth");
        if (canvasWidth) {
            _enforceMaxAndLog("canvasWidth", canvasWidth, maxDim.width, Headlights.MAX_EXCEEDED_WH);
        }

        canvasHeight = this.get("canvasHeight");
        if (canvasHeight) {
            _enforceMaxAndLog("canvasHeight", canvasHeight, maxDim.height, Headlights.MAX_EXCEEDED_WH);
        }
    },

    // TODO: Response is currently handled by GeneratorModel.handleAssetUpdate. Eventually, we can stream assets back
    // have the view receive them directly. Streaming should also avoid managing temp assets and hitting disk for perf.
    generatePreviewImmediately: function () {
        var component = this._createPreviewComponent();

        // Only request a new preview if we're sending different parameters than before.
        if (!this._previewComponentsEqual(component, this.get("lastPreviewComponent"))) {
            this.set("loading", true);
            ServerInterface.sendCommand("generatePreview", { component: component });
        }

        this.set("lastPreviewComponent", component);
    },
    
    normalizeQualityToString: function () {
        var curQuality = this.get("quality");
        if (curQuality && !_.isString(curQuality)) {
            this.set("quality", String(curQuality));
        }
    }
});

//setup the defaults once
GenSettingsModel.prototype.resetBaselineSupportedExtensions();

module.exports = GenSettingsModel;
