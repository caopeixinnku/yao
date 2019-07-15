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

/* Used for sharing globalish data about documents, like whether they have a background layer or not */

"use strict";

var Backbone = require('backbone');

var DocSettings = Backbone.Model.extend({
    
    _docHasBackground: false,
    _layerCollection: undefined,
    _currentDocId: 0,
    _originalGeneratorSettings: undefined,

    reset: function () {
        this._docHasBackground = false;
        this._currentDocId = 0;
    },
    
    setCurrentDocId: function (docId) {
        this._currentDocId = docId;
    },
    
    getCurrentDocId: function () {
        return this._currentDocId;
    },
    
    setDocHasBackground: function (hasBG) {
        this._docHasBackground = hasBG;
    },
    
    docHasBackground: function () {
        return this._docHasBackground;
    },

    getLayerCollection: function () {
        return this._layerCollection;
    },

    getOriginalGeneratorSettings: function () {
        return this._originalGeneratorSettings;
    }
});

module.exports = new DocSettings();