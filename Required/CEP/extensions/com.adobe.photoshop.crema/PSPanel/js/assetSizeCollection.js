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

var _ = require("underscore"),
    Backbone = require("backbone"),
    Headlights  = require("./utils/Headlights");


var AssetSizeCollection = Backbone.Collection.extend({
    
    defaults: function () {
        return [
            { scale: 1, suffix: ""}
        ];
    },

    preferredSizeArray: [1, 0.5, 0.75, 0.25, 2, 0.33, 1.5, 0.1, 3, 1.25, 0.3],

    maxAssetSizeScale:0,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     

    initialize: function (assetSizeCollection) {
        this.nextId = 1;

        assetSizeCollection = assetSizeCollection || this.defaults();
        assetSizeCollection.forEach(function (assetSize) {
            this.addAssetSize(assetSize);
        }.bind(this));

        this.listenTo(this, "add remove change:scale", this._updateMaxValue);
    },

    addAssetSize: function (assetSize) {
        assetSize.id = this.getNextId();
        this.add(assetSize);
        return assetSize.id;
    },

    getNextId: function () {
        return "size" + this.nextId++;
    },

    getNextPreferredSize: function () {
        // Remove already used sizes from preferred size array
        var alreadyUsed = _.map(this.toArray(), function (assetSizeModel) { return assetSizeModel.get("scale"); }),
            remainingPreferred = _.difference(this.preferredSizeArray, alreadyUsed);

        // Return first remaining size, otherwise -1
        return (remainingPreferred.length > 0) ? remainingPreferred[0] : -1;
    },
    
    generateSuffixFromScale: function (scale) {
        var suffix;
        if (scale === 1) {
            return "";
        }

        suffix = "@" + scale + "x";
        suffix = suffix.replace(/\./, ",");
        return suffix;
    },

    logAssetSizesSummary: function (count) {
        Headlights.accumulateData(Headlights.SIZES_COUNT, count);
        Headlights.logAccumulatedData(Headlights.SIZES_SUMMARY_GROUP);
    },

    logDataForOneAssetSize: function (assetSizeModel) {
        Headlights.accumulateData(Headlights.SIZES_SCALE,  assetSizeModel.get("scale"));
        Headlights.accumulateData(Headlights.SIZES_SUFFIX, assetSizeModel.get("suffix"));
        Headlights.logAccumulatedData(Headlights.ASSET_SIZES_GROUP);
    },

    logAssetSizesData : function () {
        this.logAssetSizesSummary(this.length);

        this.forEach(function (assetSizeModel) {
            this.logDataForOneAssetSize(assetSizeModel);
        }.bind(this));
    },

    _updateMaxValue : function () {
        var currentMaxAssetSizeScale = _.max(this.pluck("scale")); 
        if (currentMaxAssetSizeScale != this.maxAssetSizeScale) {
            this.maxAssetSizeScale = currentMaxAssetSizeScale;
            this.trigger("maxScaleUpdated");
        }
    }
});

module.exports = AssetSizeCollection;
