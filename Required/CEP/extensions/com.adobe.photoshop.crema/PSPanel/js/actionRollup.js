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
"use strict";

var PLUGIN_ID = "crema";

var _ = require("underscore"),
    Q = require("q"),
    docSettings = require("./docSettings.js"),
    JSXRunner = require("./JSXRunner"),
    Strings = require("./LocStrings"),
    ServerInterface = require("./serverInterface.js");

var DocRollup = function (docId) {
    this.docId = docId;
    this.defaultID = "";
    this.defaultName = null;
    this.deletedLayers = [];
    this.layers = {};
    this.generatorSettings = docSettings.getOriginalGeneratorSettings();
};

var ActionRollup = function () {
    this.docRollups = {};
    this.defaultLayers = {};

    this.reset = function () {
        this.docRollups = {};
        this.defaultLayers = {};
    };

    this.isDirty = function () {
        return (Object.keys(this.docRollups).length !== 0);
    };

    this._currentDocId = function () {
        return docSettings.getCurrentDocId();
    };

    this._getDocRollup = function (docId) {
        if (!this.docRollups[docId]) {
            this.docRollups[docId] = new DocRollup(docId);
            if (this.defaultLayers[docId]) {
                this.docRollups[docId].defaultID = this.defaultLayers[docId].id;
            }
        }
        return this.docRollups[docId];
    };

    this.serializeDocGeneratorSettings = function (generatorSettings) {
        var rollup = this._getDocRollup(this._currentDocId());
        rollup.generatorSettings = _.extend(rollup.generatorSettings || {}, generatorSettings);
    };

    this.updateLayerMetaData = function (layerId, layerSettingsData, isDocumentLayer) {
        var rollup = this._getDocRollup(this._currentDocId()),
            localGeneratorSettings = {crema: {json: JSON.stringify(layerSettingsData)}},
            previewDocUpdate = { id: this._currentDocId() },
            localDocUpdate = { id: this._currentDocId() };
        
        if (!isDocumentLayer) {
            // If we're processing a normal layer, update its metadata.
            localDocUpdate.layers = [{id: layerId, generatorSettings: localGeneratorSettings}];
        } else {
            // If we're processing the "layer" that represents the whole document, update the document level metadata.
            localDocUpdate.generatorSettings = localGeneratorSettings;
        }
        
        if (!isDocumentLayer) {
            rollup.layers[layerId] = _.extend(rollup.layers[layerId] || {}, {json: layerSettingsData});
        } else {
            rollup.generatorSettings = _.extend(rollup.generatorSettings || {}, layerSettingsData);
        }
    };

    this.updateDocumentMetaData = function(layerId, layerSettingsData) {
        this.updateLayerMetaData(layerId, layerSettingsData, true);
    };

    this.writeRolledupJSX = function (docId) {
        var rollup = this._getDocRollup(docId),
            aJSX = [],
            indent = '    ',
            newline = '\n',
            metaInfo = {"cremaVersion": "1.1"},
            setterJSON;
        
        var wrapInTryCatch = function (statement) {
            return [indent, "try {", newline,
                    indent, indent, statement, newline,
                    indent, "} catch (e) {", newline,
                    indent, indent, "errorStr += 'Exception: ' + e + ', ';", newline,
                    indent, "}", newline, newline].join("");
        };
        
        //build mega-jsx
        aJSX.push(JSXRunner.getRawJSX('setGeneratorSettings-init'));
        aJSX.push('var errorStr = "SUCCESS";' + newline);
        aJSX.push('var coreUpdate = function () {' + newline);
        
        Object.keys(rollup.layers).forEach(function (layerId) {
            var lyr = rollup.layers[layerId];
            if (_.has(lyr, "json")) {
                var lyrJSON = {json: JSON.stringify(lyr.json)};
                aJSX.push(wrapInTryCatch('setGeneratorSettingsForPlugin("' + PLUGIN_ID + '", ' + JSON.stringify(lyrJSON) + ', ' + layerId + ');'));
            }
        });

        if (rollup.generatorSettings) {
            setterJSON = {json: JSON.stringify(_.extend(rollup.generatorSettings, metaInfo))};
        } else {
            setterJSON = {json: JSON.stringify(metaInfo)};
        }
        aJSX.push(wrapInTryCatch('setGeneratorSettingsForPlugin("' + PLUGIN_ID + '", ' + JSON.stringify(setterJSON) + ');'));

        aJSX.push(newline + '};' + newline);
        aJSX.push('coreUpdate();');
        aJSX.push('errorStr');
        return aJSX.join('');
    };

    
    this.apply = function () {
        //go through all the rollups and make the edits to the doc
        var applyDeferred = Q.defer(),
            rollupKeys = Object.keys(this.docRollups);
        
        rollupKeys.forEach(function (docId) {

            var jsxOut = this.writeRolledupJSX(docId),
                rollup = this.docRollups[docId];
            JSXRunner.runRawJSX(jsxOut, applyDeferred.resolve);
        }.bind(this));
        
        if (rollupKeys.length === 0) {
            applyDeferred.resolve();
        }
        
        return applyDeferred.promise;
    };
    
};

module.exports = new ActionRollup();