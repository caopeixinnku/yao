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

/*jslint vars: true, node: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true */
/*global  */
"use strict";

var _ = require("underscore"),
    Backbone = require('backbone');

var PreviewModel = Backbone.Model.extend({
    
    defaults: {
        zoomLevel: 100
    },
   
    zoomIn: function () {
        return this.zoomStepIndexBy(1);
    },
    
    zoomOut: function () {
        return this.zoomStepIndexBy(-1);
    },
    
    zoomStepIndexBy: function (step) {
        var newZoomLevel = this.getNextZoomLevel(step, this.get("zoomLevel"));
        if (newZoomLevel) {
            this.set("zoomLevel", newZoomLevel);
        }
        return this.get("zoomLevel");
    },
    
    getNextZoomLevel: function (step, zoomLevel) {
        var zoomIndex = _.sortedIndex(this.zoomLevels, zoomLevel);
        zoomIndex = zoomIndex + step;
        return this.zoomLevels[zoomIndex];
    },
    
    getMinZoomLevel: function () {
        return _.first(this.zoomLevels);
    },

    getMaxZoomLevel: function () {
        return this.get("maxZoomLevel") || _.last(this.zoomLevels);
    },
    
    zoomLevels: [
        0.28,
        0.56,
        0.7,
        1,
        1.5,
        2,
        3,
        4,
        5,
        6.25,
        8.33,
        12.5,
        16.67,
        25,
        33.33,
        50,
        66.67,
        100,
        200,
        300,
        400,
        500,
        600,
        700,
        800,
        1200,
        1600,
        3200
    ]
});

module.exports = PreviewModel;