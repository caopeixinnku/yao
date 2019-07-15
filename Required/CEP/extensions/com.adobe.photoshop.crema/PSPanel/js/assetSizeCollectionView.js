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

"use strict";

var Backbone = require("backbone"),
    _  = require("underscore"),
    Strings = require("./LocStrings"),
    Template = require("./TemplateLoader"),
    FilePathSanitizer = require("shared/FilePathSanitizer");

var INITIAL_TAB_INDEX   = 50,
    MAX_ASSET_SIZES     = 10;

var AssetSizeCollectionView = Backbone.View.extend({
    initialize: function (options) {
        this.listenTo(this.model, "add remove", this.updateRendering);

        this.$el = options.el;
        this._assetSizesTemplate = _.template(Template.loadTemplate("../templates/assetSizes.html"));
        this._assetSizeTemplate = _.template(Template.loadTemplate("../templates/assetSize.html"));
    },
    events: {
        "click .add-size": "addAssetSize",
        "click .remove-size": "removeAssetSize",
        "blur .asset-size input[name='export-suffix-edit']": "updateSuffix",
        "blur .asset-size input[name='export-scale-edit']": "updateScale",
        "change .asset-size input[name='export-suffix-edit']": "updateSuffix",
        "change .asset-size input[name='export-scale-edit']": "updateScale",
        "change .export-size-select": "changeScaleSel",
    },
    render: function () {
        var context = Template.createTemplateContext(Strings, {}),
            scrollTop = 0,
            existingAssetCount;

        this.nextTabindex = INITIAL_TAB_INDEX;
        if (this.$assetSizeList) {
            existingAssetCount = this.$assetSizeList.find(".asset-size").length;
            if (existingAssetCount > 0) {
                if (existingAssetCount < this.model.length) {
                    scrollTop = 10000;                          // New size added, scroll to end
                } else {
                    scrollTop = this.$assetSizeList.scrollTop(); // Maintain current scroll position
                }
            }
        }
        this.$el.empty();

        this.$el.append(this._assetSizesTemplate(context));
        this.$assetSizeList = this.$el.find(".export-size-list");
        this.renderSizes();
        this.updateUI();

        // Handle scroll position
        if (scrollTop > 0) {
            this.$assetSizeList.scrollTop(scrollTop);
        }

        return this;
    },
    renderSizes: function () {
        this.model.each(this.renderSize, this);
    },
    renderSize: function (model, index, arr) {
        var $rowEl,
            id = model.get("id"),
            scale = model.get("scale"),
            context = Template.createTemplateContext(Strings, {
                sizeId: id,
                scale: scale + "x",
                suffix: model.get("suffix"),
                isOnlyRow: (arr.length === 1),
                tabindex1: this.getNextTabindex(),
                tabindex2: this.getNextTabindex(),
                tabindex3: this.getNextTabindex()
            });

        this.$assetSizeList.append(this._assetSizeTemplate(context));

        $rowEl = this.$assetSizeList.find("#" + id);
        this.updateScaleSel($rowEl, scale);
    },
    getNextTabindex: function () {
        return this.nextTabindex++;
    },

    updateUI: function() {
        // enable/disable buttons
        this.$el.find(".add-size").toggleClass("disabled", (this.model.length >= MAX_ASSET_SIZES));
    },

    // Multiple entries may be added sequentially, so debounce
    updateRendering: _.debounce(function () {
        this.render();
    }, 50),

    addAssetSize: function () {
        var newScale, newSuffix;

        newScale = this.model.getNextPreferredSize();
        if (newScale === -1) {
            // There are no "preferred" sizes left, so use 1
            newScale = 1;
        }
        newSuffix = this.model.generateSuffixFromScale(newScale);
        newSuffix = this.enforceUniqueSuffix(newSuffix, "");

        this.model.addAssetSize({scale: newScale, suffix: newSuffix});
    },

    removeAssetSize: function (e) {
        var sizeId = Backbone.$(e.target).closest(".asset-size").attr("id");

        this.model.remove(sizeId);
    },

    reloadRow: function ($rowEl, reloadScale, reloadSuffix) {
        var sizeId = $rowEl.attr("id"),
            sizeModel = this.model.get(sizeId);
        
        if (reloadScale === undefined) {
            reloadScale = true;
        }
        if (reloadSuffix === undefined) {
            reloadSuffix = true;
        }

        //reload scale and suffix from the model.
        if (reloadScale) {
            $rowEl.find(".export-size-combobox input[name='export-scale-edit']").val(sizeModel.get("scale") + "x");
        }

        if (reloadSuffix) {
            $rowEl.find(".export-size-suffix input[name='export-suffix-edit']").val(sizeModel.get("suffix"));
        }
    },

    validateSuffix: function (suffix) {
        //check for invalid character and replace with _
        return FilePathSanitizer.sanitize(suffix.trim());
    },

    updateSuffix: function (e) {
        var $inputEl = Backbone.$(e.target),
            validatedString = this.validateSuffix($inputEl.val()),
            sizeId = $inputEl.closest(".asset-size").attr("id");

        if (validatedString !== this.model.get(sizeId).get("suffix") ) {
            validatedString = this.enforceUniqueSuffix(validatedString, sizeId);
            //Update model
            this.model.get(sizeId).set("suffix", validatedString);
            $inputEl.val(validatedString);
        }
    },

    validateScale: function (scale) {
        var val = scale.trim(),
            parsedVal = parseFloat(val, 10);

        if (_.isNaN(parsedVal) || (!_.isFinite(parsedVal) || parsedVal === 0)) {
            parsedVal = undefined;
        } else if (parsedVal < 0) {
            parsedVal = -parsedVal;
        }

        if (parsedVal > 5) {
            parsedVal = 5;
        }

        return parsedVal;
    },

    updateScale: function (e) {
        var $inputEl = Backbone.$(e.target),
            inputScale = $inputEl.val(),
            validatedScale = this.validateScale(inputScale),
            $rowEl = $inputEl.closest(".asset-size"),
            sizeId = $rowEl.attr("id"),
            oldScale = this.model.get(sizeId).get("scale");

        //Todo : Limit the validated scale so that we do not overshoot max image dimensions.

        if (!validatedScale || (validatedScale === oldScale && (validatedScale + "x") !== inputScale)) {
            this.reloadRow($rowEl, true, false);
        } else if (validatedScale !== oldScale) {
            this.updateModelFromScale(sizeId, validatedScale);
            this.reloadRow($rowEl);
            this.updateScaleSel($rowEl, validatedScale);
        }
    },

    updateScaleSel: function ($rowEl, validatedScale) {
        $rowEl.find(".export-size-select").val(validatedScale);
    },

    changeScaleSel: function (e) {
        var $inputEl = Backbone.$(e.target),
            $rowEl = $inputEl.closest(".asset-size"),
            sizeId = $rowEl.attr("id");

        //Update the model
        this.updateModelFromScale(sizeId, $inputEl.val());        
        this.reloadRow($rowEl);
    },

    updateModelFromScale: function (id, newScale) {
        var sizeModel = this.model.get(id),
            oldScale = sizeModel.get("scale"),
            oldSuffix = sizeModel.get("suffix"),
            genSuffix = this.model.generateSuffixFromScale(oldScale), // generated original
            genSuffixRegex = new RegExp(genSuffix + "_\\d+"),         // generated duplicate pattern
            newSuffix;
        
        sizeModel.set("scale", newScale);
        
        // If suffix has not been edited from original, then update it
        if (oldSuffix === genSuffix || genSuffixRegex.test(oldSuffix)) {
            newSuffix = this.model.generateSuffixFromScale(newScale);
            newSuffix = this.enforceUniqueSuffix(newSuffix, id);
            sizeModel.set("suffix", newSuffix);
        }
    },

    enforceUniqueSuffix: function(suffix, sizeId) {
        var uniqueSuffix, lowerSuffix, existingSuffixes,
            uniqueSuffixFound = false,
            incr = 1;

        var cmpFunc = function (suffix) {
            return (suffix === this.suffix);
        };

        // Build local array of other existing suffixes
        existingSuffixes = _.map(this.model.toArray(), function (sizeModel) {
            return (sizeModel.get("id") === sizeId) ? undefined : sizeModel.get("suffix").toLowerCase();
        });

        lowerSuffix = suffix.toLowerCase();

        // Compare original
        if (!existingSuffixes.some(cmpFunc, {suffix: lowerSuffix})) {
            return suffix;
        }

        // Duplicate: generate a unique suffix
        while (!uniqueSuffixFound) {
            incr++;
            uniqueSuffix = lowerSuffix + "_" + incr;
            uniqueSuffixFound = !existingSuffixes.some(cmpFunc, {suffix: uniqueSuffix});
        }
        
        return (suffix + "_" + incr);
    }
});

module.exports = AssetSizeCollectionView;
