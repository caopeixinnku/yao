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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true */
/*global window: true, require: true, exports: true*/

(function () {

    "use strict";
    
    var _               = require("underscore"),
        Backbone        = require("backbone"),
        Headlights      = require("./utils/Headlights"),
        JSXRunner       = require("./JSXRunner"),
        DialogView      = require("./dialogView.js"),
        GeneratorModel  = require("./generatorModel.js"),
        CremaGlobal     = require("./cremaGlobal.js"),
        ExportKind      = require("./exportKind.js"),
        dialogView,
        dialogModel,
        generatorModel;
    
    var init = function () {
        CremaGlobal.csInterface.setContextMenu("<menu></menu>", function () {});
        dialogModel =  new Backbone.Model();
        
        generatorModel = new GeneratorModel();
        generatorModel.once("docinfo-loaded", function (docinfo) {
            var selectionSize = docinfo && docinfo._selectionById ? docinfo._selectionById.length : 0;

            switch (generatorModel.get("exportKind")) {
                case ExportKind.Document:
                    Headlights.logEvent(Headlights.CREMA_FUNNEL, Headlights.DLG_LAUNCHED_FROM_MENU_FOR_DOCUMENT);
                    break;
                case ExportKind.DocumentWithArtboards:
                    Headlights.logEvent(Headlights.CREMA_FUNNEL, Headlights.DLG_LAUNCHED_FROM_MENU_FOR_DOCUMENT_ARTBOARDS);
                    break;
                default:
                    Headlights.logEvent(Headlights.CREMA_FUNNEL, Headlights.DLG_LAUNCHED_FROM_MENU_FOR_SELECTION + selectionSize);
                    break;
            }
        });
        
        var pumpQueueFaster = function () {
            return generatorModel.get("layersLoading") || dialogModel.get("exporting");
        };
        
        var pumpGeneratorQueue = _.partial(JSXRunner.runJSX, "flushGeneratorQueue"),
            pumpPending = false,
            pumpGeneratorOnTimer = function() {
                var runQueueNow = pumpQueueFaster();
                if (pumpPending && !runQueueNow) {
                    return;
                }
                pumpPending = true;
                var corePumpCallback = function(){
                    pumpPending = false;
                    pumpGeneratorQueue(pumpGeneratorOnTimer);
                };
                if (runQueueNow) {
                    CremaGlobal.window.requestAnimationFrame(corePumpCallback);
                } else {
                    _.delay(corePumpCallback, 500);
                }
            },
            runQueue = _.partial(pumpGeneratorQueue, pumpGeneratorOnTimer),
            runQueueOnNextTick = _.partial(_.delay, runQueue, 1);
        
        runQueueOnNextTick();
        generatorModel.on("change:layersLoading", runQueueOnNextTick);
        dialogModel.on("change:exporting", runQueueOnNextTick);

        Backbone.$("html").attr("lang", CremaGlobal.csInterface.getHostEnvironment().appUILocale.substr(0, 2));

        
        dialogView = new DialogView({ el: Backbone.$("body"), model: dialogModel, generatorModel: generatorModel });
        dialogView.render();
    };

    exports.init = init;
    
}());
