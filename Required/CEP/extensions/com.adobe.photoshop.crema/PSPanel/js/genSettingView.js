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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true, node: true, regexp: true */
/*jshint unused: true */

"use strict";

var Backbone = require('backbone'),
    _  = require("underscore"),
    Strings = require("./LocStrings"),
    Template = require("./TemplateLoader"),
    Headlights = require("./utils/Headlights"),
    Inputs = require("./utils/inputs"),
    constrainer = require("./constrainer"),
    Modifiers = require("./utils/modifiers"),
    KeyEvent = require("./utils/KeyEvent.js"),
    rounder = require("./rounder"),
    Constants = require("shared/Constants"),
    CremaGlobal     = require("./cremaGlobal.js"),
    filePathSanitizer = require("shared/FilePathSanitizer");

var GenSettingView = Backbone.View.extend({
    usedScrubbing: false,
    usedArrowKeys: false,
    usedMultiselectEdit: false,
    isScrubbing: false,
    previousPngBits: "",
    
    initialize: function () {
        this.setupModelEventListeners();
        
        this.listenTo(this.collection, "change:selected", this.updateAllSettings);
        this.listenToOnce(this.collection, "add", this.updateAllSettings);
        
        this.maxScale = this.collection.getSelectedExportableSettingsMaxScale() || 500;
        this.maxImageDimensions = this.collection.getSelectedExportableMaxImageDimensions() || 
                                  { width: 4999, height: 4999 };
        
        this.lastValidValue = {
            width: "",
            height: "",
            canvasWidth: "",
            canvasHeight: "",
            scale: "100",
            imageQuality: "100%"
        };
        this.convertSRGBChecked = false;
        this.embedICCProfileChecked = false;
    },

    events: {
        "change .export-format": "changeExportFormat",
        "blur .quality-text-input": "changeQualityText",
        "change .quality-text-input": "changeQualityText",
        "keyup .quality-text-input": "keyupQualityText",
        "keydown .quality-text-input": "keyboardQualityChange",
        "mousedown .quality-range-input": "mouseDownQualityRange",
        "mouseup .quality-range-input": "togglePercentageView",
        "blur .quality-range-input": "togglePercentageView",
        "change .options input[name='width']": "handleDimensionScaleChange",
        "change .options input[name='height']": "handleDimensionScaleChange",
        "change .options input[name='scale']": "changeScaleText",
        "change .options input[name='canvasWidth']": "handleDimensionScaleChange",
        "change .options input[name='canvasHeight']": "handleDimensionScaleChange",
        "keydown .options input[name='width']": "keyboardDimensionChange",
        "keydown .options input[name='height']": "keyboardDimensionChange",
        "keydown .options input[name='scale']": "keyboardScaleChange",
        "keydown .options input[name='canvasWidth']": "keyboardDimensionChange",
        "keydown .options input[name='canvasHeight']": "keyboardDimensionChange",
        "keyup .options input[name='width']": "keyboardDimensionScaleConstrain",
        "keyup .options input[name='height']": "keyboardDimensionScaleConstrain",
        "keyup .options input[name='scale']": "keyboardDimensionScaleConstrain",
        "blur .options input[name='width']": "blurDimensionScale",
        "blur .options input[name='height']": "blurDimensionScale",
        "blur .options input[name='scale']": "blurDimensionScale",
        "blur .options input[name='canvasWidth']": "blurDimensionScale",
        "blur .options input[name='canvasHeight']": "blurDimensionScale",
        "change .scale-select": "changeScaleSel",
        "change .select-interpolation": "changeInterpolationSel",
        "click .metadata-radio": "changeMetadataRadio",
        "click .options label.checkbox.transparency": "changeTransparency",
        "click .options label.checkbox.smaller-file": "changeSmallerFile",
        "click .options label.checkbox.srgb": "changeColorSpaceSRGB",
        "click .options label.checkbox.embedcolorprofile": "changeEmbedICCProfile",
        "click .reset-canvas-dimensions": "resetCanvasDimensions",
        "input .quality-range-input": "changeQualityRange",
        "change .quality-range-input": "changeQualityRange",
        "keydown .quality-range-input": "mouseDownQualityRange",
        "click .percentage": "togglePercentageView"
    },

    cacheElements: function () {
        this.$errorIndicator = this.$('.icon-info');
        this.$elExportFormat = this.$(".export-format");
        this.$elQualityText = this.$(".quality-text-input");
        this.$elQualitySlider = this.$(".percentage-range");
        this.$elQualityRange = this.$(".quality-range-input");
        this.$elQualityRow = this.$(".quality-row");
        this.$elSvgWarningRow = this.$(".svg-warning-row");
        this.$elInterpolationSel = this.$(".select-interpolation");
        this.$elTransparencyCheckbox = this.$("input[value='transparency']");
        this.$elTransparencyCheckboxLabel = this.$(".options label.checkbox.transparency");
        this.$elSmallerFileCheckbox = this.$("input[value='smaller-file']");
        this.$elSmallerFileCheckboxLabel = this.$(".options label.checkbox.smaller-file");
        this.$elTransparencyRow = this.$(".transparency-row");
        this.$elSmallerFileRow = this.$(".smaller-file-row");
        this.$elMetadataRadio = this.$(".metadata-radio");
        this.$elColorSpaceFieldset = this.$(".colorspace");
        this.$elColorSpaceSRGB = this.$("input[value='srgb']");
        this.$elColorSpaceEmbedProfile = this.$("input[value='embedcolorprofile']");
        this.$elColorSpaceEmbedProfileLabel = this.$(".embedcolorprofile");
        this.$options = this.$(".options");
        this.$layer = this.$(".layer");
        this.$width =  this.$options.find("input[name='width']");
        this.$height =  this.$options.find("input[name='height']");
        this.$scaleSel = this.$(".scale-select");
        this.$scaleText = this.$options.find("input[name='scale']");
        this.$canvasWidth = this.$("input[name='canvasWidth']");
        this.$canvasHeight = this.$("input[name='canvasHeight']");
        this.$resetCanvasDimensions = this.$(".reset-canvas-dimensions");
        this.$heightRoundingTip = this.$(".height-rounding-tip");
        this.$widthRoundingTip = this.$(".width-rounding-tip");
        this._widthFieldName = this.$width.attr("name");
        this._heightFieldName = this.$height.attr("name");
    },
    "class": "asset",
    indeterminateClass: "indeterminate",
    extSupportsQuality: {
        "jpg": true
    },
    extSupportsColorSpace: {
        "gif": true,
        "jpg": true,
        "png": true,
        "png-8": true,
        "png-24": true,
        "png-32": true,
        "svg": false
    },
    extSupportsEmbedICCProfile: {
        "gif": false,
        "jpg": true,
        "png": true,
        "png-8": true,
        "png-24": true,
        "png-32": true,
        "svg": false
    },
    template: _.template(Template.loadTemplate("../templates/genSettingView.html")),

    render: function () {
        var context, strQuality, placeHolderQuality, placeHolderScale,
            quality = this.collection.getSelectedExportableSettingsValue("quality"),
            extSettings = this.getViewSettings(),
            allSelectedLayerSettings = this.collection.getSettings({selected:true});

        this.colorSpaceEnabled = this.getDisplayValue(extSettings.colorSpaceEnabled) || false;
        this.embedICCProfileEnabled = this.getDisplayValue(extSettings.embedICCProfileEnabled) || false;
        this.qualityVisible = this.getDisplayValue(extSettings.qualityVisible) || false;
        this.transparencyVisible = this.getDisplayValue(extSettings.transparencyVisible) || false;
        this.transparencySupported = extSettings.transparencySupported;
        this.smallerFileVisible = this.getDisplayValue(extSettings.smallerFileVisible) || false;
        this.smallerFileSupported = extSettings.smallerFileSupported;

        strQuality = this.getDisplayValue(quality, "", "", function (q) {
            if (this._isPng(extSettings.extDisplay)) {
                q = 100;    // png format overloads quality prop, so reset that here
            }
            return q + "%";
        }.bind(this));
        placeHolderQuality = this.getDisplayValue(quality, "", Inputs.INDETERMINATE_DISPLAY, function () {
            return "";  // no placeholder if valid
        });
        placeHolderScale = this.getDisplayValue(this.collection.getSelectedExportableSettingsValue("scale"), "", Inputs.INDETERMINATE_DISPLAY, function () {
            return "";  // no placeholder if valid
        });
        
        context = Template.createTemplateContext(Strings, {
            width: this.getDisplayValue(this.collection.getSelectedExportableSettingsValue("width")),
            height: this.getDisplayValue(this.collection.getSelectedExportableSettingsValue("height")),
            quality: strQuality,
            placeHolderQuality: placeHolderQuality,
            colorSpaceEnabled: this.colorSpaceEnabled,
            embedICCProfileEnabled: this.embedICCProfileEnabled,
            qualityVisible: this.qualityVisible,
            placeHolderScale: placeHolderScale,
            transparencyVisible: this.transparencyVisible,
            smallerFileVisible: this.smallerFileVisible,
            errorMessage: this.getDisplayValue(this.collection.getSettingsValue(allSelectedLayerSettings, "errorMessage"))
        });
        this.$el.html(this.template(context));
        this.cacheElements();
        this.updateDisabledState();
        
        this.renderFormat(extSettings.extDisplay);
        this.renderQuality();
        this.renderWidthAndHeight();
        this.renderPlaceholderDimensions();
        this.renderCanvasSizes();
        this.renderInterpolationType();
        this.renderMetadataType();
        this.renderColorSpaceSRGBType();
        this.renderLoading();
        
        this.updateErrorMessage();
        this.setupScrubbingHandlers();
        
        if (strQuality) {
            this.lastValidValue.imageQuality = parseInt(strQuality, 10);
        }

        return this;
    },
    
    updateAllSettings: function () {
        this.setupModelEventListeners();
        this.maxScale = this.collection.getSelectedExportableSettingsMaxScale() || 500;
        this.maxImageDimensions = this.collection.getSelectedExportableMaxImageDimensions() || 
                                  { width: 4999, height: 4999 };
        this.render();
    },
    
    getDisplayValue: function (val, displayUndefined, displayIndeterminate, func) {
        if (val === undefined || val === null) {
            return (displayUndefined === undefined) ? "" : displayUndefined;
        } else if (val === Inputs.INDETERMINATE_VALUE) {
            return (displayIndeterminate === undefined) ? "" : displayIndeterminate;
        }
        return func ? func(val) : val;
    },
    
    renderCanvasSizes: function () {
        var dim = this.getCurrentImageDimensions(),
            cnvW = this.collection.getSelectedExportableSettingsValue("canvasWidth"),
            cnvH = this.collection.getSelectedExportableSettingsValue("canvasHeight"),
            cnvDisplayW = this.getDisplayValue(cnvW, dim && dim.width),
            cnvDisplayH = this.getDisplayValue(cnvH, dim && dim.height),
            placeholderW = "",
            placeholderH = "",
            canReset = (cnvW || cnvH) ? true : false,
            disabled = this.isDialogDisabled();
        if (cnvW === Inputs.INDETERMINATE_VALUE) {
            placeholderW = Inputs.INDETERMINATE_DISPLAY;
        }
        if (cnvH === Inputs.INDETERMINATE_VALUE) {
            placeholderH = Inputs.INDETERMINATE_DISPLAY;
        }
        this.$canvasHeight.val(cnvDisplayH).attr("placeholder", placeholderH);
        this.$canvasWidth.val(cnvDisplayW).attr("placeholder", placeholderW);
        this.lastValidValue.canvasHeight = String(cnvDisplayH);
        this.lastValidValue.canvasWidth = String(cnvDisplayW);
        this.$resetCanvasDimensions.prop("disabled", !canReset || disabled);
    },
    
    renderWidthAndHeight: function () {
        //render scale first because actual size might only overwrite width or height
        this.renderWidthAndHeightFromScale();
        this.renderWidthAndHeightFromActualImageSize();
    },
    
    renderPreviewDimensionChange: function () {

        if (this.isScrubbing) {
            _.delay(this.renderPreviewDimensionChange.bind(this), 100);
            return;
        }
        if (this.renderWidthAndHeightFromActualImageSize()) {
            var hVal = this.$height.val(),
                wVal = this.$width.val();
            if (hVal) {
                this.lastValidValue.height = hVal;
            }
            if (wVal) {
                this.lastValidValue.width = wVal;
            }
            var errors = this.getRenderingScaleErrors();
            this.showScaleErrorWarning(errors);
            this.logDimensionScaleErrors(errors);
        }
    },
    
    renderWidthAndHeightFromActualImageSize: function () {
        var actualDim = this.collection.getSelectedExportableImageDimensions(),
            canvasWidth = this.collection.getSelectedExportableSettingsValue("canvasWidth"),
            canvasHeight = this.collection.getSelectedExportableSettingsValue("canvasHeight"),
            width = "",
            height = "",
            disabled = actualDim === Inputs.INDETERMINATE_VALUE || this.isDialogDisabled();
        
        if (actualDim && (!canvasWidth || !canvasHeight)) {
            height = actualDim.height || "";
            width = actualDim.width || "";
            if (!canvasHeight) {
                if (this.$height.val() != height) {
                    this.$heightRoundingTip.toggleClass("hide", this.lastEditedField !== this._heightFieldName);
                }
                this.$height.val(height).prop("disabled", disabled);
            }
            if (!canvasWidth) {
                if (this.$width.val() != width) {
                    this.$widthRoundingTip.toggleClass("hide", this.lastEditedField !== this._widthFieldName);
                }
                this.$width.val(width).prop("disabled", disabled);
            }
            
            return true;
        }
        
        return false;
    },
    
    renderWidthAndHeightFromScale: function () {
        var w, h,
            scale = this.collection.getSelectedExportableSettingsValue("scale");
        if (scale === Inputs.INDETERMINATE_VALUE) {
            this.updateScaleVals(Inputs.INDETERMINATE_DISPLAY, "");
        }
        else {
            scale = rounder(scale, 4);
            w = this.collection.getSelectedExportableSettingsValue("width");
            h = this.collection.getSelectedExportableSettingsValue("height");
            if (!_.isFinite(scale) && !_.isFinite(w) && !_.isFinite(h)) {
                scale = 1;
            }
            if (_.isFinite(scale) && scale > 0) {
                var scaleInPercent = String(rounder(scale * 100, 2));
                this.updateScaleVals(scaleInPercent, scaleInPercent);
                this.changeScaleVal(scaleInPercent, false);
            }
        }
    },
    
    renderLoading: function () {
        var loading = !!this.collection.getSelectedExportableSettingsValue("loading");
        this.$el.toggleClass("loading", loading);
    },

    setupModelEventListeners: function () {
        var layerSettingsArray = this.collection.getSettings({selected:true});

        // Remove old listeners, if any
        if (this.modelEventListeners) {
            this.modelEventListeners.forEach(function (model) {
                this.stopListening(model, "change:disabled", this.updateDisabledState);
                this.stopListening(model, "change:errorMessage change:extension", this.updateErrorMessage);
                this.stopListening(model, "change:originalDimensions change:previewDimensions", this.renderPlaceholderDimensions);
                this.stopListening(model, "change:originalDimensions change:scale", this.renderWidthAndHeight);
                this.stopListening(model, "change:previewDimensions", this.renderPreviewDimensionChange);
                this.stopListening(model, "change:canvasWidth change:canvasHeight change:scale change:originalDimensions change:previewDimensions", this.renderCanvasSizes);
                this.stopListening(model, "change:quality", this.renderQuality);
                this.stopListening(model, "change:loading", this.renderLoading);
            }.bind(this));
        }

        // Add new listeners
        this.modelEventListeners = [];
        layerSettingsArray.forEach(function (model) {
            this.listenTo(model, "change:disabled", this.updateDisabledState);
            this.listenTo(model, "change:errorMessage change:extension", this.updateErrorMessage);
            this.listenTo(model, "change:originalDimensions change:previewDimensions", this.renderPlaceholderDimensions);
            this.listenTo(model, "change:originalDimensions change:scale", this.renderWidthAndHeight);
            this.listenTo(model, "change:previewDimensions", this.renderPreviewDimensionChange);
            this.listenTo(model, "change:canvasWidth change:canvasHeight change:scale change:originalDimensions change:previewDimensions", this.renderCanvasSizes);
            this.listenTo(model, "change:quality", this.renderQuality);
            this.listenTo(model, "change:loading", this.renderLoading);
            this.modelEventListeners.push(model);
        }.bind(this));
    },
    
    setupScrubbingHandlers: function () {
        this.updateScrubbingHandler(this.$height);
        this.updateScrubbingHandler(this.$width);
        this.updateScrubbingHandler(this.$canvasHeight);
        this.updateScrubbingHandler(this.$canvasWidth);
        this.updateScrubbingHandler(this.$scaleText);
    },
    
    // Get display values of "extension" property.
    getViewSettings: function() {
        var result, ext, quality, extSettings,
            layerSettingsArray = this.collection.getSelectedExportableSettings();
        
        _.some(layerSettingsArray, function (model) {
            ext = model.get("extension");
            quality = model.get("quality");
            extSettings = this._getViewSettingsForExtension(ext, quality);
            
            if (result === undefined) {
                result = _.extend({}, extSettings);
            } else {
                // Figure out if each value is determinant.
                if (result.extDisplay !== extSettings.extDisplay) {
                    result.extDisplay = Inputs.INDETERMINATE_VALUE;
                }
                if (result.colorSpaceEnabled !== extSettings.colorSpaceEnabled) {
                    result.colorSpaceEnabled = Inputs.INDETERMINATE_VALUE;
                }
                if (result.embedICCProfileEnabled !== extSettings.embedICCProfileEnabled) {
                    result.embedICCProfileEnabled = Inputs.INDETERMINATE_VALUE;
                }
                if (result.qualityVisible !== extSettings.qualityVisible) {
                    result.qualityVisible = Inputs.INDETERMINATE_VALUE;
                }
                if (result.transparencyVisible !== extSettings.transparencyVisible) {
                    result.transparencyVisible = Inputs.INDETERMINATE_VALUE;
                }
                if (result.transparencySupported !== extSettings.transparencySupported) {
                    result.transparencySupported = Inputs.INDETERMINATE_VALUE;
                }
                if (result.smallerFileVisible !== extSettings.smallerFileVisible) {
                    result.smallerFileVisible = Inputs.INDETERMINATE_VALUE;
                }
                if (result.smallerFileSupported !== extSettings.smallerFileSupported) {
                    result.smallerFileSupported = Inputs.INDETERMINATE_VALUE;
                }

                // No need to continue once these are indeterminate
                return (result.extDisplay === Inputs.INDETERMINATE_VALUE &&
                        result.colorSpaceEnabled === Inputs.INDETERMINATE_VALUE &&
                        result.embedICCProfileEnabled === Inputs.INDETERMINATE_VALUE &&
                        result.qualityVisible === Inputs.INDETERMINATE_VALUE &&
                        result.transparencyVisible === Inputs.INDETERMINATE_VALUE &&
                        result.smallerFileVisible === Inputs.INDETERMINATE_VALUE);
            }
        }.bind(this));
        
        return result || {};
    },
    
    getIncrement: function (e, delta) {
        if (Modifiers.isShiftOnlyEvent(e)) {
            return delta * 10;
        } else if (Modifiers.isAltOnlyEvent(e)) {
            return delta * 0.1;
        }
        return delta;
    },
    
    isElementScrubbing: function ($el) {
        return $el.hasClass("scrubbing");
    },
    
    logScrubbing: function () {
        // Only log once per dialog
        if (!this.usedScrubbing) {
            GenSettingView.prototype.usedScrubbing = true;
            Headlights.accumulateData(Headlights.SETTING_USED, Headlights.SCRUBBING);
        }
    },
    
    logArrowKeys: function () {
        // Only log once per dialog
        if (!this.usedArrowKeys) {
            GenSettingView.prototype.usedArrowKeys = true;
            Headlights.accumulateData(Headlights.SETTING_USED, Headlights.ARROWKEYS);
        }
    },
    
    logMultiSelectEdit: function () {
        // Only log once per dialog
        if (!this.usedMultiselectEdit && this.collection.getSelectedExportableSettings().length > 1) {
            GenSettingView.prototype.usedMultiselectEdit = true;
            Headlights.accumulateData(Headlights.SETTING_USED, Headlights.MULTISELCT_EDIT);
        }
    },
    
    logDimensionScaleChange: function (name, invalidValue, correctedValue, maxExceeded, beforeStringVal, editedStringVal, finalStringVal) {
        if (invalidValue) {
            // reset to last valid
            if (name === "scale") {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_SCALE_INVALID);
                Headlights.logData(Headlights.SETTINGS_GROUP, Headlights.SETTING_SCALE_INVALID, editedStringVal);
            } else {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_WH_INVALID);
            }
        } else if (correctedValue) {
            if (maxExceeded) {
                var maxExceededKey = (name === "scale") ? Headlights.MAX_EXCEEDED_SCALE : Headlights.MAX_EXCEEDED_WH;
                Headlights.logEvent(Headlights.CREMA_WARNING, maxExceededKey);
                Headlights.logData(Headlights.MAX_EXCEEDED_GROUP, maxExceededKey, editedStringVal);
            }
            if (name === "scale") {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_SCALE_CORRECTED);
                Headlights.logData(Headlights.SETTINGS_GROUP, Headlights.SETTING_SCALE_CORRECTED, editedStringVal);
            } else {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_WH_CORRECTED);
            }
        } else if (finalStringVal !== beforeStringVal) {
            if (name === "scale") {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_SCALE_VALID);
                Headlights.logData(Headlights.SETTINGS_GROUP, Headlights.SETTING_SCALE_VALID, editedStringVal);
            } else if (finalStringVal === "") {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_WH_CLEARED);
            } else {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_WH_VALID);
            }
        }
    },

    showScaleErrorWarning: function(errors) {
        this.$widthRoundingTip.toggleClass("hide", !( errors.width && this.lastEditedField === this._widthFieldName));
        this.$heightRoundingTip.toggleClass("hide", !(errors.height && this.lastEditedField === this._heightFieldName));
    },
    
    logDimensionScaleErrors: function(errors) {
        
        if (!errors.width && !errors.height) {
            return;
        }

        Headlights.logEvent(Headlights.CREMA_WARNING, Headlights.DIM_ERROR_SCALE_VS_ACTUAL);
        Headlights.logData(Headlights.DIM_ERRORS_GROUP, Headlights.DIM_ERROR_WIDTH_OFF, errors.width);
        Headlights.logData(Headlights.DIM_ERRORS_GROUP, Headlights.DIM_ERROR_HEIGHT_OFF, errors.height);
        Headlights.logData(Headlights.DIM_ERRORS_GROUP, Headlights.DIM_ERROR_SCALE, errors.scale);
        Headlights.logData(Headlights.DIM_ERRORS_GROUP, Headlights.DIM_ERROR_NATRUAL_HEIGHT, errors.originalHeight);
        Headlights.logData(Headlights.DIM_ERRORS_GROUP, Headlights.DIM_ERROR_NATRUAL_WIDTH, errors.originalWidth);
        Headlights.logData(Headlights.DIM_ERRORS_GROUP, Headlights.DIM_ERROR_SCALED_HEIGHT, errors.scaledHeight);
        Headlights.logData(Headlights.DIM_ERRORS_GROUP, Headlights.DIM_ERROR_SCALED_WIDTH, errors.scaledWidth);
    },
    
    getRenderingScaleErrors: function() {
        var errors = {height: 0, width: 0},
            scaledDim = this.getScaledDimensions(),
            actualDim = this.collection.getSelectedExportableImageDimensions(),
            canvasWidth = this.collection.getSelectedExportableSettingsValue("canvasWidth"),
            canvasHeight = this.collection.getSelectedExportableSettingsValue("canvasHeight"),
            scale = this.collection.getSelectedExportableSettingsValue("scale") || 1,
            origDim = this.collection.getSelectedExportableNaturalImageDimensions();
        
        if (!scaledDim ||!actualDim || scaledDim === Inputs.INDETERMINATE_VALUE || actualDim === Inputs.INDETERMINATE_VALUE) {
            return errors;
        }
        errors.originalWidth = origDim.width;
        errors.scaledWidth = scaledDim.width;
        errors.originalHeight = origDim.height;
        errors.scaledHeight = scaledDim.height;
        errors.scale = scale;
        
        if (!canvasWidth &&
            _.isFinite(scaledDim.width) && scaledDim.width > 0 && 
            _.isFinite(actualDim.width) && actualDim.width > 0) {
            errors.width = actualDim.width - scaledDim.width;
        }
        
        if (!canvasHeight &&
            _.isFinite(scaledDim.height) && scaledDim.height > 0 && 
            _.isFinite(actualDim.height) && actualDim.height > 0) {
            errors.height = actualDim.height - scaledDim.height;
        }
        
        return errors;
    },
    
    updateFormat: function(ext, quality) {
        this.logMultiSelectEdit();
        var layerSettingsArray = this.collection.getSelectedExportableSettings();

        _.each(layerSettingsArray, function (model) {
            var extIn = model.get("extension"),
                fileName = model.get("file"),
                baseName = fileName.slice(0, -1 * (extIn.length + 1));
        
            fileName = baseName + "." + ext;

            var vals = {
                file: fileName,
                extension: ext
            };
            if (quality && quality !== Inputs.INDETERMINATE_VALUE) {
                vals.quality = quality;
            }
            model.set(vals);
        }, this);
    },
    
    // This assumes that we aren't showing a validation message and just does the fixup
    validateFileName: function (newName) {
        var curExt = this.collection.getSelectedExportableSettingsValue("extension"),
            validatedName = newName.trim(),
            ext;
        
        //check for invalid character and replace with _
        validatedName = filePathSanitizer.sanitize(validatedName);
             
        //check that it uses the current ext, and add it if it's missing
        ext = validatedName.split('.').pop();
        if (curExt && ext !== curExt) {
            validatedName += "." + curExt;
        }
        
        return validatedName;
    },
    
    updateErrorMessage: function () {
        var allSelectedLayerSettings = this.collection.getSettings({selected:true}),
            msg = this.collection.getSettingsFirstTruthyValue(allSelectedLayerSettings, "errorMessage"),
            ext = this.collection.getSettingsValue(allSelectedLayerSettings, "extension"),
            fontErrorDetected = false;
        
        if (msg && this._isSVG(ext)) {
            this.$errorIndicator.attr('aria-label', msg).addClass('active');
            if( msg.indexOf("Fonts") > -1 ) {
                fontErrorDetected = true;
            }
        } else {
            this.$errorIndicator.removeClass('active');
        }

        this.$elSvgWarningRow.toggleClass("hide", !fontErrorDetected);
    },
    
    mouseDownQualityRange: function () {
        this._disarmMouseDown = true;
    },

    _listenForMouseDownOutsideSlider: function () {
        var self = this;
        
        this._fnEvtMouseDown = function () {
            if (self._disarmMouseDown) {
                self._disarmMouseDown = false;
            } else {
                self.$elQualitySlider.toggleClass('show');
            }
            self._cleanupMouseDownOutsideSlider();
        };

        CremaGlobal.window.document.addEventListener("mousedown", this._fnEvtMouseDown);
    },

    fixUpInvalidInput: function ($inputEl) {
        var val = $inputEl.val().trim(),
            parsedVal = parseFloat(val, 10),
            name = $inputEl.attr("name");

        if (_.isNaN(parsedVal)) {
            if (val !== "" || name === "imageQuality") {
                parsedVal = val.replace(/[^\d.]/g, '').trim();
                if (parsedVal === "") {
                    // all chars invalid -- reset to last valid
                    parsedVal = this.lastValidValue[name];
                }
            } else {
                parsedVal = val;
            }
        } else if (!_.isFinite(parsedVal) || (parsedVal === 0 && name !== "imageQuality")) {
            // 0 is valid only for quality
            parsedVal = this.lastValidValue[name];
        } else {
            if (parsedVal < 0) {
                parsedVal = -parsedVal;
            }
        }
        return (parsedVal === undefined ? undefined : parsedVal.toString());
    },

    updateScaleVals: function (newTextScale, newSelScale) {
        if (newTextScale === Inputs.INDETERMINATE_DISPLAY) {
            this.$scaleText.val("").attr("placeholder", Inputs.INDETERMINATE_DISPLAY);
        } else {
            this.setWithTrailingPerc(this.$scaleText, newTextScale);
            this.$scaleText.attr("placeholder", "");
        }
        this.lastValidValue.scale = newTextScale;
        this.$scaleSel.val(newSelScale);
    },

    constrainDimensions: function ($inputEl, updateModel) {
        var toConstrain = {},
            name = $inputEl.attr("name"),
            toUpdate = name === "width" ? "height" : "width",
            elToUpdate =  this["$" + toUpdate],
            toAdd,
            naturalDimensions = this.collection.getSelectedExportableNaturalImageDimensions(),
            goodDimensions = naturalDimensions && naturalDimensions !== Inputs.INDETERMINATE_VALUE,
            actualDim = this.collection.getSelectedExportableImageDimensions(),
            goodActualDimensions = actualDim && actualDim !== Inputs.INDETERMINATE_VALUE,
            newValues;
        
        if (goodActualDimensions && actualDim[name] === parseInt($inputEl.val(), 10)) {
            // The dimension was set to its previous value, so just restore the scale percentage.
            var correctPerc = this.collection.getSelectedExportableSettingsValue("scale") * 100;
            correctPerc = rounder(correctPerc, 2);

            this.updateScaleVals(correctPerc, "");
            this.renderWidthAndHeightFromActualImageSize();
            return;
        }
        
        if ($inputEl.val()) {
            toConstrain[name] = $inputEl.val();
            newValues = goodDimensions ? constrainer(toConstrain, naturalDimensions, name) : {};
            toAdd = newValues[toUpdate] ? Math.round(newValues[toUpdate]) : "";
            elToUpdate.val(toAdd);
            this.lastValidValue[toUpdate] = toAdd.toString();
            this.updateScaleVals(newValues.scale, "");
        } else {
            elToUpdate.val("");
            this.lastValidValue[toUpdate] = "";
            this.updateScaleVals("100", "100");
        }

        if (updateModel) {
            this.persistScale();
        }
    },
    
    // Compare the two passed strings; return true if they're the same other than an
    // extra trailing '%' char on str2
    sameButTrailingPerc: function (str1, str2) {
        if (str2 === str1 + "%") {
            return true;
        }

        return false;
    },
    
    setWithTrailingPerc: function ($el, val) {
        if (/%$/.test(val)) {
            $el.val(val);
        } else {
            $el.val(val + "%");
        }
    },
    
    handleDimensionScaleChange: function (e) {
        this.dimensionScaleChange(Backbone.$(e.target), true, true, true);
    },
    
    dimensionScaleChange: function ($inputEl, headlightsLogging, updateModel, validate) {
        var name = $inputEl.attr("name"),
            beforeStringVal = this.lastValidValue[name],
            editedStringVal = $inputEl.val(),
            finalStringVal = this.fixUpInvalidInput($inputEl),
            parsedVal = parseFloat(finalStringVal, 10),
            maxExceeded = false,
            invalidValue = false,
            correctedValue = false,
            imageDims,
            decPlaces,
            min,
            max;
        
        this.lastEditedField = name;

        if (name === "scale") {
            // we want to round to 2 decimal places, so we'll multiply by 100 before we round
            decPlaces = 2;
            min = 1;
            max = this.maxScale;
            // we don't want to allow empty value for scale
            if (finalStringVal === "") {
                finalStringVal = beforeStringVal;
            }
        } else if (name === "width" || name === "canvasWidth") {
            // Note that canvasWidth/canvasHeight is not constrained to image aspect ratio
            // like width/height, so they could exceed these limits without exceeding max
            // pixels, but it doesn't seem common enough to handle separately.
            min = 1;
            max = this.maxImageDimensions.width;
        } else if (name === "height" || name === "canvasHeight") {
            min = 1;
            max = this.maxImageDimensions.height;
        }

        if (editedStringVal !== beforeStringVal && finalStringVal === beforeStringVal) {
            invalidValue = true;
        } else if (this.sameButTrailingPerc(finalStringVal, editedStringVal)) {
            // clear the trailing %
            this.$scaleText.val(finalStringVal);
        } else if (finalStringVal !== editedStringVal) {
            correctedValue = true;
        }

        if (finalStringVal === "") {
            // valid -- update last valid
            this.lastValidValue[name] = "";
        } else if (_.isNaN(parsedVal)) {
            invalidValue = true;
        } else {
            if (min && parsedVal < min) {
                // clip to min, if appropriate
                parsedVal = min;
                correctedValue = true;
            } else if (max && parsedVal > max) {
                // clip to max, if appropriate
                parsedVal = max;
                maxExceeded = true;
                correctedValue = true;
            } else if (parsedVal !== Math.floor(parsedVal)) {
                if (decPlaces) {
                    // Round to appropriate number of places
                    var newVal = rounder(parsedVal, decPlaces);
                    if (newVal !== parsedVal) {
                        parsedVal = newVal;
                        correctedValue = true;
                    }
                }
                else {
                    // Truncate fractional values
                    parsedVal = Math.floor(parsedVal);
                    correctedValue = true;
                }
            }
            if (correctedValue) {
                finalStringVal = parsedVal.toString();
            }
            
            // valid -- update last valid
            this.lastValidValue[name] = finalStringVal;
        }

        if (!validate && (invalidValue || correctedValue)) {
            // We're not validating (e.g. while typing) and we have an invalid
            // or corrected value, so stop here. It will get corrected on blur.
            return;
        }

        if (invalidValue) {
            // reset to last valid
            $inputEl.val(beforeStringVal);
        } else if (correctedValue) {
            $inputEl.val(parsedVal);
        }

        if (headlightsLogging) {
            this.logDimensionScaleChange(name, invalidValue, correctedValue, maxExceeded, beforeStringVal, editedStringVal, finalStringVal);
        }
        
        if (!invalidValue && (name === "width" || name === "height")) {
            this.constrainDimensions($inputEl, updateModel);
        } else if (name === "canvasWidth" || name === "canvasHeight") {
            if (invalidValue) {
                this.renderCanvasSizes();
            } else if (finalStringVal === "") {
                this.collection.unsetSelectedExportableSettingsValue(name);
            } else if (updateModel) {
                // Don't "set" canvas size if value hasn't changed from image size unless canvas field has
                // already been set, because user could just be tabbing through this field
                imageDims = this.getCurrentImageDimensions();
                if (this.collection.getSelectedExportableSettingsValue(name) !== undefined ||
                        (name === "canvasWidth" && parsedVal !== imageDims.width) ||
                        (name === "canvasHeight" && parsedVal !== imageDims.height)) {
                    this._setSelectedSettingsValue(name, parsedVal, this.isElementScrubbing($inputEl));
                }
            }
        } else if (name === "scale") {
            this.changeScaleVal(parsedVal, updateModel);
            if (updateModel) {
                this.setWithTrailingPerc(this.$scaleText, this.$scaleText.val());
            }
        }
        
        this.setupScrubbingHandlers();
    },
    
    // Don't log Headlights data here. It will get logged on Enter or blur.
    dimensionIncrementalChange: function ($inputEl, delta, updateModel) {
        var intVal, newVal, dim, max,
            name = $inputEl.attr("name"),
            val = $inputEl.val();

        if (val === "" && (name === "canvasWidth" || name === "canvasHeight")) {
            dim = this.getScaledDimensions();
            if (dim) {
                val = (name === "canvasWidth") ? dim.width : dim.height;
            }
        }

        intVal = parseInt(val, 10);
        if (_.isFinite(intVal)) {
            newVal = intVal + delta;

            if (name === "width" || name === "canvasWidth") {
                max = this.maxImageDimensions.width;
            } else {
                max = this.maxImageDimensions.height;
            }

            newVal = Math.max(1, Math.min(max, newVal));
            $inputEl.val(newVal);
            this.dimensionScaleChange($inputEl, false, updateModel, true);
        }
    },
    
    keyboardDimensionChange: function (e) {
        var delta = 0;

        if (e.keyCode === KeyEvent.DOM_VK_DOWN) {
            delta = this.getIncrement(e, -1);
        } else if (e.keyCode === KeyEvent.DOM_VK_UP) {
            delta = this.getIncrement(e, 1);
        } else if (e.keyCode === KeyEvent.DOM_VK_RETURN || 
                   e.keyCode === KeyEvent.DOM_VK_ENTER) {
            this.handleDimensionScaleChange(e);
            e.preventDefault();
            return;
        }
        
        if (Math.abs(delta) >= 1) {
            this.logArrowKeys();
            this.dimensionIncrementalChange(Backbone.$(e.target), delta, false);
            e.preventDefault();
        }
    },

    keyboardDimensionScaleConstrain: function (e) {
        switch (e.keyCode) {
            case KeyEvent.DOM_VK_DOWN:      // Navigation keys
            case KeyEvent.DOM_VK_LEFT:
            case KeyEvent.DOM_VK_RIGHT:
            case KeyEvent.DOM_VK_UP:
            case KeyEvent.DOM_VK_TAB:
            case KeyEvent.DOM_VK_ALT:       // Modifiers
            case KeyEvent.DOM_VK_CONTROL:
            case KeyEvent.DOM_VK_META:
            case KeyEvent.DOM_VK_SHIFT:
            case KeyEvent.DOM_VK_RETURN:    // Handled in keydown
            case KeyEvent.DOM_VK_ENTER:
                break;
            default:
                // Constrain while typing, but don't commit change or update preview
                this.dimensionScaleChange(Backbone.$(e.target), false, false, false);
                break;
        }
    },

    // Update values changed with up/down arrow keys
    blurDimensionScale: function (e) {
        var displayVal, modelVal,
            $inputEl = Backbone.$(e.target),
            name = $inputEl.attr("name");

        // Width and height persist as scale
        if (name === "width" || name === "height") {
            $inputEl = this.$scaleText;
            name = "scale";
        }
        displayVal = $inputEl.val();
        modelVal = this.collection.getSelectedExportableSettingsValue(name);
        if (name === "scale") {
            // Display value of "66.67%" is stored in model as "0.6667"
            modelVal = rounder(modelVal * 100, 2) + "%";
        }
        
        if (displayVal !== Inputs.INDETERMINATE_DISPLAY && displayVal !== modelVal) {
            this.dimensionScaleChange(Backbone.$(e.target), true, true, true);
        }
    },
    
    _cleanupMouseDownOutsideSlider: function () {
        //clean up event listener
        if (this._fnEvtMouseDown) {
            CremaGlobal.window.document.removeEventListener("mousedown", this._fnEvtMouseDown);
            this._fnEvtMouseDown = null;
        }
    },
    
    _scrollQualitySliderIntoView: function ($parentList, preShowHeight) {
        if (!$parentList.length) {
            return;
        }
        var self = this,
            scrollHeight = $parentList[0].scrollHeight,
            fnScrollIntoView = function () {
                var sliderBottom = self.$elQualityText.offset().top + self.$elQualityText.height(),
                    parentListHeight = $parentList.height(),
                    parentScrollTop = $parentList.scrollTop(),
                    scrollPos;
                scrollPos = parentScrollTop + sliderBottom - parentListHeight;
                
                if (parentScrollTop < scrollPos) {
                    $parentList.scrollTop(scrollPos);
                }
            };
            
        if (preShowHeight < scrollHeight) {
            _.delay(fnScrollIntoView, 100);
        } else {
            fnScrollIntoView();
        }
    },

    togglePercentageView: function () {
        var wasShowing = false,
            self = this,
            preShowHeight,
            $parentList = self.$el.parents(".scroller");
        
        if (this.$elQualitySlider.hasClass('show')) {
            wasShowing = true;
        }
        
        if (!wasShowing) {
            if (!this.qualityVisible) {
                return;
            }
            this._listenForMouseDownOutsideSlider();
            this.$elQualityText.focus();
            
            if ($parentList.length) {
                preShowHeight = $parentList[0].scrollHeight;
            }
            
        } else {
            this._cleanupMouseDownOutsideSlider();
        }
        
        //actually toggle
        this.$elQualitySlider.toggleClass('show');
        
        if (wasShowing) {
            _.delay(function () {
                self.$elQualityText.blur();
            }, 10);
        } else if ($parentList.length) {
            this._scrollQualitySliderIntoView($parentList, preShowHeight);
        }
    },
    
    isDialogDisabled: function() {
        return this.collection.getSelectedExportableSettings().length === 0 ? true :
                this.collection.getSelectedExportableSettingsValue("disabled") || false;
    },

    updateDisabledState: function () {
        var disabled = this.isDialogDisabled();
        this.$("input, button, select").prop("disabled", disabled);
        this.$("label.checkbox").toggleClass("disabled", disabled);
        if (!disabled) {
            this.renderCanvasSizes();
            this.renderWidthAndHeight();
            this.renderPlaceholderDimensions();
            this.updateTransparencyEnabled();
        }
    },

    changeExportFormat: function () {
        var exFmt = this.$elExportFormat.val().toLowerCase(),
            ext,
            quality,
            extSettings;

        if (exFmt === "png" && this.previousPngBits) {
            exFmt = "png-" + this.previousPngBits;
        }
        extSettings = this._getViewSettingsForExtension(exFmt, quality);

        this.colorSpaceEnabled = extSettings.colorSpaceEnabled;
        this.embedICCProfileEnabled = extSettings.embedICCProfileEnabled;
        this.qualityVisible = extSettings.qualityVisible;
        this.transparencyVisible = extSettings.transparencyVisible;
        this.transparencySupported = extSettings.transparencySupported;
        this.smallerFileVisible = extSettings.smallerFileVisible;
        this.smallerFileSupported = extSettings.smallerFileSupported;

        // Transparency & smallerFile checkboxes are shown for png, hidden for other formats.
        // If they're already showing (i.e. format was png) , remember their settings, in case we come back to png.
        if (!this.$elTransparencyRow.hasClass("hide")) {
            var previousTransparency = Inputs.getTristateCheckboxValue(this.$elTransparencyCheckbox),
                previousSmallerFile = Inputs.getTristateCheckboxValue(this.$elSmallerFileCheckbox);

            this.previousPngBits = this.getPngBits(previousTransparency, previousSmallerFile);
        }

        this.$elExportFormat.toggleClass(this.indeterminateClass, extSettings.extDisplay === Inputs.INDETERMINATE_VALUE);

        ext = extSettings.extDisplay;
        if (this.qualityVisible) {
            // png format overloads quality prop, so reset that here
            quality = 100;
        } else {
            if (exFmt === "png-8") {
                ext = "png-8";
                quality = 8;
            } else if (exFmt === "png-24") {
                ext = "png-24";
                quality = 24;
            } else if (exFmt === "png" || exFmt == "png-32") {
                ext = "png-32";
                quality = 32;
            }
        }
        
        if (!this._isSVG(ext)) {
            this.$elSvgWarningRow.addClass("hide");
        }

        if (this.transparencyVisible) {
            this.$elTransparencyRow.removeClass("hide");
            Inputs.setTristateCheckboxValue(this.$elTransparencyCheckbox, this.transparencySupported);
        } else {
            this.$elTransparencyRow.addClass("hide");
        }

        if (this.smallerFileVisible) {
            this.$elSmallerFileRow.removeClass("hide");
            Inputs.setTristateCheckboxValue(this.$elSmallerFileCheckbox, this.smallerFileSupported);
        } else {
            this.$elSmallerFileRow.addClass("hide");
        }

        this.updateFormat(ext, quality);
        this.renderColorSpaceSRGBType();
        this.renderQuality();
    },
    
    getPngBits: function (transparencySupported, smallerFileSupported) {
        if (smallerFileSupported) {
            return "8";
        } else if (transparencySupported) {
            return "32";
        }
        return "24";
    },
    
    updateTransparencyEnabled: function () {
        if (!this.transparencyVisible || !this.smallerFileVisible) {
            return;
        }

        // Transparency check box should be set and disabled for Small File to reflect what
        // result will be. To support transparent vs. non-transparent png-8 (small) files,
        // we'll need to send additional data to generator.
        if (this.smallerFileSupported === true) {
            this.transparencySupported = true;
            Inputs.setTristateCheckboxValue(this.$elTransparencyCheckbox, true);
        }
        this.$elTransparencyRow.find("label").toggleClass("disabled", this.smallerFileSupported);
    },
    
    changeTransparency: function (e) {
        var pngBits;
        
        if (this.transparencyVisible) {
            // Need explicit check in case previous state was false or indeterminate
            this.transparencySupported = (this.transparencySupported !== true);
            
            pngBits = this.getPngBits(this.transparencySupported, this.smallerFileSupported);
            this.updateFormat("png-" + pngBits, pngBits);

            Inputs.setTristateCheckboxValue(this.$elTransparencyCheckbox, this.transparencySupported);
            e.preventDefault();
            e.stopPropagation();
        }
    },

    changeSmallerFile: function (e) {
        var pngBits;
        
        if (this.smallerFileVisible) {
            // Need explicit check in case previous state was false or indeterminate
            this.smallerFileSupported = (this.smallerFileSupported !== true);
            
            pngBits = this.getPngBits(this.transparencySupported, this.smallerFileSupported);
            this.updateFormat("png-" + pngBits, pngBits);

            Inputs.setTristateCheckboxValue(this.$elSmallerFileCheckbox, this.smallerFileSupported);

            // Transparency is enabled/disabled based on value of Smaller File setting
            this.updateTransparencyEnabled();
            
            e.preventDefault();
            e.stopPropagation();
        }
    },

    // Map extension settings to values for view controls
    _getViewSettingsForExtension: function (ext, quality) {
        var pngBits, pngMatch,
            pngregex = /(png)-?(24|32|8)?/,
            colorSpaceEnabled = !!this.extSupportsColorSpace[ext],
            embedICCProfileEnabled = !!this.extSupportsEmbedICCProfile[ext],
            qualityVisible = !!this.extSupportsQuality[ext],
            extLower = (ext) ? ext.toLowerCase() : "",
            extDisplay = extLower,
            transparencyVisible = false,
            transparencySupported = true,
            smallerFileVisible = false,
            smallerFileSupported = false;

        if (this._isPng(extLower)) {
            transparencyVisible = true;
            smallerFileVisible = true;
            extDisplay = "png";
            if (extLower === "png") {
                // Extension may be "png" with quality of 8, 24, 32, or undefined
                pngBits = (quality) ? quality.toString() : "32";
            } else {
                // Otherwise, PNG file ext is "png-8", "png-24", or "png-32"
                pngMatch = extLower.match(pngregex);
                pngBits = pngMatch[2];
            }
            if (pngBits === "8") {
                smallerFileSupported = true;
            } else if (pngBits === "24") {
                transparencySupported = false;
            }
        }

        return {
            extDisplay: extDisplay,
            colorSpaceEnabled: colorSpaceEnabled,
            embedICCProfileEnabled: embedICCProfileEnabled,
            qualityVisible: qualityVisible,
            transparencyVisible: transparencyVisible,
            transparencySupported: transparencySupported,
            smallerFileVisible: smallerFileVisible,
            smallerFileSupported: smallerFileSupported
        };
    },
    
    getCurrentImageDimensions: function () {
        return this.collection.getSelectedExportableImageDimensions() || this.getScaledDimensions();  
    },

    getScaledDimensions: function (percent) {
        if (!percent) {
            percent = (this.collection.getSelectedExportableSettingsValue("scale") || 1) * 100;
            percent = rounder(percent, 2);
        }
        
        var origDim = this.collection.getSelectedExportableNaturalImageDimensions();
        if (!origDim || origDim === Inputs.INDETERMINATE_VALUE || !_.isFinite(percent)) {
            return undefined;
        }
        
        if (origDim.width === 0 || origDim.height === 0) {
            return undefined;     // prevent divide by zero
        }
        
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

    changeScaleVal: function (newScale, updateModel) {
        var rawScale = parseFloat(newScale, 10),
            dim = this.getScaledDimensions(rawScale) || {},
            disabled = this.collection.getSelectedExportableNaturalImageDimensions() === Inputs.INDETERMINATE_VALUE ||
                    this.isDialogDisabled(),
            height = dim.height || "",
            width = dim.width || "";

        this.$height.val(height).prop("disabled", disabled);
        this.$width.val(width).prop("disabled", disabled);
        this.lastValidValue.height = height.toString();
        this.lastValidValue.width = width.toString();
        if (updateModel) {
            this.persistScale();
        }
    },
    
    changeScaleSel: function () {
        var newScale = this.$scaleSel.val();
        if (newScale > this.maxScale) {
            Headlights.logEvent(Headlights.CREMA_WARNING, Headlights.MAX_EXCEEDED_SCALE);
            Headlights.logData(Headlights.MAX_EXCEEDED_GROUP, Headlights.MAX_EXCEEDED_SCALE, newScale);
            Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_SCALE_CORRECTED);
            Headlights.logData(Headlights.SETTINGS_GROUP, Headlights.SETTING_SCALE_CORRECTED, newScale);
            newScale = this.maxScale;
        }
        Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.SETTING_SCALE_SELECTOR);
        Headlights.logData(Headlights.SETTINGS_GROUP, Headlights.SETTING_SCALE_SELECTOR, newScale);
        this.lastValidValue.scale = newScale;
        this.lastEditedField = "";
        this.changeScaleVal(newScale, true);
        this.setWithTrailingPerc(this.$scaleText, newScale);
    },

    changeScaleText: function (e) {
        this.handleDimensionScaleChange(e);

        var newScale = this.$scaleText.val();
        this.changeScaleVal(newScale, true);
        this.setWithTrailingPerc(this.$scaleText, newScale);
        this.$scaleSel.val("");
    },
    
    // Don't log Headlights data here. It will get logged on Enter or blur.
    scaleIncrementalChange: function (delta, updateModel) {
        var newVal,
            oldVal = parseFloat(this.$scaleText.val(), 10);
        
        if (!_.isFinite(oldVal)) {
            return;
        }
        
        newVal = Math.max(1, Math.min(this.maxScale, oldVal + delta));
        
        this.setWithTrailingPerc(this.$scaleText, newVal);
        this.dimensionScaleChange(this.$scaleText, false, updateModel, true);

        this.$scaleSel.val("");
    },
    
    keyboardScaleChange: function (e) {
        var delta = 0;

        if (e.keyCode === KeyEvent.DOM_VK_DOWN) {
            delta = this.getIncrement(e, -1);
        } else if (e.keyCode === KeyEvent.DOM_VK_UP) {
            delta = this.getIncrement(e, 1);
        } else if (e.keyCode === KeyEvent.DOM_VK_RETURN ||
                   e.keyCode === KeyEvent.DOM_VK_ENTER) {
            this.changeScaleText(e);
            e.preventDefault();
            return;
        }
        
        if (delta !== 0) {
            this.logArrowKeys();
            this.scaleIncrementalChange(delta, false);
            e.preventDefault();
        }
    },
    
    changeInterpolationSel: function () {
        this._setSelectedSettingsValue("interpolationType", this.$elInterpolationSel.val(), false);
        this.renderInterpolationType();
    },
    
    changeMetadataRadio: function () {
        var val = this.$elMetadataRadio.filter(":checked").prop("id");
        this.collection.setSelectedExportableSettingsValue("metadataType", val);
        this.logMultiSelectEdit();
        this.renderMetadataType();
    },

    changeColorSpaceSRGB: function () {
        var colorProfile;

        // Need explicit check in case previous state was false or indeterminate
        this.convertSRGBChecked = (this.convertSRGBChecked !== true);
        colorProfile = this.convertSRGBChecked ? Constants.SRGB_COLOR_PROFILE : "";
        this._setSelectedSettingsValue("useICCProfile", colorProfile, false);
    },
    
    changeEmbedICCProfile: function () {
        // Need explicit check in case previous state was false or indeterminate
        this.embedICCProfileChecked = (this.embedICCProfileChecked !== true);
        this._setSelectedSettingsValue("embedICCProfile",  this.embedICCProfileChecked, false);
    },

    keyupQualityText: function (evt) {
        if (evt.which === 13 || evt.which === 27) { //enter or esc
            if (this.$elQualitySlider.hasClass('show')) {
                this.togglePercentageView();
                evt.stopPropagation();
            } else if (evt.which === 13) {//enter
                this.$elQualityText.blur();
                evt.stopPropagation();
            }
        }
    },
    
    persistScale: function () {
        var val = parseFloat(this.lastValidValue.scale, 10) / 100,
            cur = this.collection.getSelectedExportableSettingsValue("scale"),
            isScrubbing = this.isElementScrubbing(this.$width) ||
                          this.isElementScrubbing(this.$height) ||
                          this.isElementScrubbing(this.$scaleText);
        this._setSelectedSettingsValue("scale", val, isScrubbing);
        if (val === cur) {
            this.renderWidthAndHeightFromActualImageSize();
        }
    },
    
    getQualityValue: function () {
        var value = this.fixUpInvalidInput(this.$elQualityText);
        value = parseInt(value, 10);
        if (value > 100) {
            value = 100;
        }
        return value;
    },

    keyboardQualityChange: function (e) {
        var intVal,
            delta = 0,
            slideIsOpen = this.$elQualitySlider.hasClass('show');

        if (e.keyCode === KeyEvent.DOM_VK_DOWN || (e.keyCode === KeyEvent.DOM_VK_LEFT && slideIsOpen)) {
            delta = this.getIncrement(e, -1);
        } else if (e.keyCode === KeyEvent.DOM_VK_UP || (e.keyCode === KeyEvent.DOM_VK_RIGHT && slideIsOpen)) {
            delta = this.getIncrement(e, 1);
        }
        if (Math.abs(delta) >= 1) {
            intVal = this.getQualityValue();
            this.$elQualityRange.val(intVal + delta);
            this.$elQualityRange.trigger("change");
            e.preventDefault();
        }
    },

    changeQualityText: function () {
        var intVal = this.getQualityValue();
        if (_.isFinite(intVal)) {
            this.$elQualityRange.val(intVal);
            this.$elQualityRange.trigger("change");
            this._setSelectedSettingsValue("quality", intVal, false);
            this.lastValidValue.imageQuality = intVal;
        }
    },

    renderPlaceholderDimensions: function () {
        var newDim = this.collection.getSelectedExportableImageDimensions() ||
                     this.collection.getSelectedExportableNaturalImageDimensions(),
            scale = this.collection.getSelectedExportableSettingsValue("scale"),
            placeHolderWidth = "",
            placeHolderHeight = "",
            indeterminate = scale === Inputs.INDETERMINATE_VALUE ||
                       newDim === Inputs.INDETERMINATE_VALUE,
            disabled = indeterminate || this.isDialogDisabled();

        placeHolderWidth = this.getDisplayValue(newDim, "", Inputs.INDETERMINATE_DISPLAY, function (dim) {
            if(indeterminate) {
                return Inputs.INDETERMINATE_DISPLAY;
            } else if (disabled) {
                return "";
            }
            return Math.round(dim.width).toString();
        });
        placeHolderHeight = this.getDisplayValue(newDim, "", Inputs.INDETERMINATE_DISPLAY, function (dim) {
            if(indeterminate) {
                return Inputs.INDETERMINATE_DISPLAY;
            } else if (disabled) {
                return "";
            }
            return Math.round(dim.height).toString();
        });

        this.$width.attr("placeholder", placeHolderWidth).prop("disabled", disabled);
        this.$height.attr("placeholder", placeHolderHeight).prop("disabled", disabled);
    },

    renderFormat: function (extDisplay) {
        this.$elExportFormat.val(this.getDisplayValue(extDisplay, "", Inputs.INDETERMINATE_DISPLAY));
        this.$elExportFormat.toggleClass(this.indeterminateClass, extDisplay === Inputs.INDETERMINATE_VALUE);
        if (this.transparencyVisible) {
            Inputs.setTristateCheckboxValue(this.$elTransparencyCheckbox, this.transparencySupported);
        }
        if (this.smallerFileVisible) {
            Inputs.setTristateCheckboxValue(this.$elSmallerFileCheckbox, this.smallerFileSupported);
        }

        // Transparency is enabled/disabled based on value of Smaller File setting
        this.updateTransparencyEnabled();
    },

    renderQuality: function() {
        var qualityRaw = this.collection.getSelectedExportableSettingsValue("quality"),
            qualityInt = parseInt(qualityRaw, 10),
            quality = _.isNaN(qualityInt) ? qualityRaw : qualityInt,
            extSettings = this.getViewSettings(),
            qualityRangeVal = this.getDisplayValue(quality, "", "50"),
            qualityTextPlaceholderVal = this.getDisplayValue(quality, "", Inputs.INDETERMINATE_DISPLAY),
            qualityTextVal = this.getDisplayValue(quality, "", "", function (q) {
                return q + "%";
            });

        this.qualityVisible = this.getDisplayValue(extSettings.qualityVisible) || false;
        this.$elQualityRow.toggleClass("hide", !this.qualityVisible);
        this.$elQualityText.attr("placeholder", qualityTextPlaceholderVal).val(qualityTextVal);
        this.$elQualityRange.val(qualityRangeVal);
    },

    renderInterpolationType: function() {
        var interpolationType = this.collection.getSelectedExportableSettingsValue("interpolationType");
        this.$elInterpolationSel.val(interpolationType);
        this.$elInterpolationSel.toggleClass(this.indeterminateClass, interpolationType === Inputs.INDETERMINATE_VALUE);
    },

    renderMetadataType: function() {
        var metadataType = this.collection.getSelectedExportableSettingsValue("metadataType") || "none",
            isIndeterminate = metadataType === Inputs.INDETERMINATE_VALUE;

        if (isIndeterminate) {
            this.$elMetadataRadio.prop("checked", false);
        } else {
            this.$elMetadataRadio.filter("#" + metadataType).prop("checked", true);
        }
        this.$elMetadataRadio.toggleClass(this.indeterminateClass, isIndeterminate);
    },

    renderColorSpaceSRGBType: function () {
        var useICCProfile = this.collection.getSelectedExportableSettingsValue("useICCProfile"),
            embedICCProfile = this.collection.getSelectedExportableSettingsValue("embedICCProfile"),
            extSettings = this.getViewSettings();

        // Show the color space section if enabled is true or indeterminate (which means
        // that there's at least one item for which it is enabled.)
        this.colorSpaceEnabled = this.getDisplayValue(extSettings.colorSpaceEnabled) !== false;
        this.$elColorSpaceFieldset.toggleClass("hide", !this.colorSpaceEnabled);

        this.convertSRGBChecked = this.getDisplayValue(useICCProfile, false, Inputs.INDETERMINATE_VALUE, function (colorSRGBVal) {
            return (colorSRGBVal === Constants.SRGB_COLOR_PROFILE);
        });
        Inputs.setTristateCheckboxValue(this.$elColorSpaceSRGB, this.convertSRGBChecked);
        
        this.embedICCProfileEnabled = this.getDisplayValue(extSettings.embedICCProfileEnabled) !== false;
        this.$elColorSpaceEmbedProfile.toggleClass("hide", !this.embedICCProfileEnabled);
        this.$elColorSpaceEmbedProfileLabel.toggleClass("hide", !this.embedICCProfileEnabled);
        
        this.embedICCProfileChecked = this.getDisplayValue(embedICCProfile, false, Inputs.INDETERMINATE_VALUE);
        Inputs.setTristateCheckboxValue(this.$elColorSpaceEmbedProfile, this.embedICCProfileChecked);
    },
    
    _debouncedSetSelectedSettingsValue: _.debounce(function (name, val) {
        this.collection.setSelectedExportableSettingsValue(name, val);
    }, 500),

    _setSelectedSettingsValue: function (name, val, debounce) {
        this.logMultiSelectEdit();
        if (debounce) {
            this._debouncedSetSelectedSettingsValue(name, val);
        } else {
            this.collection.setSelectedExportableSettingsValue(name, val);
        }
    },

    changeQualityRange: function () {
        if (!this.qualityVisible) {
            return;
        }
        var rngVal = parseInt(this.$elQualityRange.val(), 10);
        
        this.$elQualityText.val(rngVal + "%");
        this._setSelectedSettingsValue("quality", rngVal, true);
        this.lastValidValue.imageQuality = rngVal;
    },
    
    resetCanvasDimensions: function () {
        this.collection.unsetSelectedExportableSettingsValue("canvasWidth");
        this.collection.unsetSelectedExportableSettingsValue("canvasHeight");
    },
    
    _isPng: function (ext) {
        if (!_.isString(ext)) {
            return false;
        }
        ext = ext.toLowerCase().replace(/png-\d+$/, "png");
        return ext === "png";
    },

    _isSVG: function (ext) {
        return (_.isString(ext) && ext.toLowerCase().indexOf("svg") > -1);
    },

    /**
     * Generates mouse handlers for scrubbing gestures on related icon.
     */
    updateScrubbingHandler: function ($inputEl) {
        var indeterminate, val, placeholder,
            $target = $inputEl.closest(".row").find(".label");

        // Don't register/unregister handlers while scrubbing
        if (this.isScrubbing) {
            return;
        }
        
        if ($target.length) {
            val = $inputEl.val();
            placeholder = $inputEl.prop("placeholder") || "";
            indeterminate = val === Inputs.INDETERMINATE_DISPLAY ||
                            (val === "" && (placeholder === "" || placeholder === Inputs.INDETERMINATE_DISPLAY));
            if (indeterminate || $inputEl.prop("disabled")) {
                $target.removeClass("scrubbable");
                this.unregisterDragHandler($target);
            } else {
                $target.addClass("scrubbable");
                this.registerDragHandler($target, this.handleLabelScrub, {inputEl: $inputEl});
            }
        }
    },

    incrementalChange: function ($inputEl, delta) {
        switch ($inputEl.attr("name")) {
            case "height":
            case "width":
            case "canvasHeight":
            case "canvasWidth":
                if (Math.abs(delta) >= 1) {
                    this.dimensionIncrementalChange($inputEl, delta, true);
                    return true;
                }
                break;
            case "scale":
                if (delta !== 0) {
                    this.scaleIncrementalChange(delta, true);
                    return true;
                }
                break;
            default:
                break;
        }
        return false;
    },

    // Drag handler for scrubbable fields.
    handleLabelScrub: function (event, data) {
        var delta;
        
        if (event.type === "mousedown") {
            data.startX = event.clientX;
            data.origValue = data.inputEl.val();
            this.isScrubbing = true;
            this.logScrubbing();
            Backbone.$("body").addClass("scrubbable");
            data.inputEl.addClass("scrubbing scrubbable");
        } else if (event.type === "mousemove") {
            delta = this.getIncrement(event, event.clientX - data.startX);
            if (this.incrementalChange(data.inputEl, delta)) {
                data.startX = event.clientX;
            }
        } else if (event.type === "mouseup") {
            this.isScrubbing = false;
            Backbone.$("body").removeClass("scrubbable");
            data.inputEl.removeClass("scrubbing scrubbable");
        }
    },

    // Generic drag helper for all our draggable fields.
    registerDragHandler: function (selector, handler, data) {
        var self = this;
        this.$el.find(selector).on("mousedown.panehandlerdrag", function (event) {
            handler.call(self, event, data);
            Backbone.$(CremaGlobal.window).on("mousemove.panehandlerdrag", function (event) {
                handler.call(self, event, data);
            }).on("mouseup.panehandlerdrag", function (event) {
                Backbone.$(CremaGlobal.window).off(".panehandlerdrag");
                handler.call(self, event, data);
            });
        });
    },
    
    unregisterDragHandler: function (selector) {
        this.$el.find(selector).off(".panehandlerdrag");
    }
});

module.exports = GenSettingView;
