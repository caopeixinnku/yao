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

var _               = require("underscore"),
    Backbone        = require('backbone'),
    GenableModel    = require('./genableModel.js'),
    ActionRollup    = require("./actionRollup.js");


var DocumentLayer = GenableModel.extend({
    defaults: function () {
        var baseDefaults = _.result(GenableModel.prototype, 'defaults');
        return _.defaults({
            layerId: DocumentLayer.GetDefaultLayerID(),
            invisible: false,
            //this is used for views
            selected: true,
            //isActive is the model communication
            isActive: true,
            isDocument: true
        }, baseDefaults);
    },
    _updateModelMetaData: function(json) {
        ActionRollup.updateDocumentMetaData(this.get("layerId"), {assetSettings: json});
    },
});

DocumentLayer.GetDefaultLayerID = function() {
    return 0;
};
DocumentLayer.isDocumentLayerId = function(layerID) {
    return DocumentLayer.GetDefaultLayerID() === layerID;
};
module.exports = DocumentLayer;
